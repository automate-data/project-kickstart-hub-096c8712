import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .limit(1)

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { role, full_name, rg, username, condominium_id, location_id } = await req.json()
    const resolvedLocationId = (role === 'tower_doorman' && location_id) ? location_id : null

    if (!full_name || !role || !condominium_id || !username) {
      return new Response(JSON.stringify({ error: 'Name, username, role and condominium are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate internal email from username
    const sanitizedUsername = username.toLowerCase().trim().replace(/[^a-z0-9._-]/g, '')
    const email = `${sanitizedUsername}@cond.internal`

    // Check if a user with this email already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      const tempPassword = 'Mudar@123'
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: full_name || '', must_change_password: true, username: sanitizedUsername },
        password: tempPassword,
      })

      if (createError) throw createError
      userId = newUser.user.id

      // Update profile
      await adminClient
        .from('profiles')
        .update({ full_name, rg: rg || '', email })
        .eq('id', userId)
    }

    // Check if role already exists for this condominium (active)
    const { data: existingActiveRole } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('condominium_id', condominium_id)
      .is('deleted_at', null)
      .maybeSingle()

    if (existingActiveRole) {
      return new Response(JSON.stringify({ error: 'User already has a role in this condominium' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if a soft-deleted role exists — reactivate it
    const { data: deletedRole } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('condominium_id', condominium_id)
      .not('deleted_at', 'is', null)
      .maybeSingle()

    if (deletedRole) {
      const { error: reactivateError } = await adminClient
        .from('user_roles')
        .update({ role, deleted_at: null, location_id: resolvedLocationId })
        .eq('id', deletedRole.id)
      if (reactivateError) throw reactivateError
    } else {
      const { error: roleError } = await adminClient
        .from('user_roles')
        .insert({ user_id: userId, role, condominium_id, location_id: resolvedLocationId })
      if (roleError) throw roleError
    }

    const isNew = !existingUser
    return new Response(JSON.stringify({ success: true, user_id: userId, is_new: isNew, temp_password: isNew ? 'Mudar@123' : undefined }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
