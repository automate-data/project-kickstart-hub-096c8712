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
      .maybeSingle()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { role, full_name, rg, condominium_id } = await req.json()

    if (!full_name || !role || !condominium_id) {
      return new Response(JSON.stringify({ error: 'Name, role and condominium are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate a unique email for the auth user
    const uniqueId = crypto.randomUUID().substring(0, 8)
    const generatedEmail = `staff-${uniqueId}@internal.local`

    // Create user via admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: generatedEmail,
      email_confirm: true,
      user_metadata: { full_name: full_name || '' },
      password: crypto.randomUUID(),
    })

    if (createError) throw createError

    const userId = newUser.user.id

    // Update profile with RG
    await adminClient
      .from('profiles')
      .update({ full_name, rg: rg || '' })
      .eq('id', userId)

    // Check if role already exists for this condominium
    const { data: existingRole } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('condominium_id', condominium_id)
      .maybeSingle()

    if (existingRole) {
      return new Response(JSON.stringify({ error: 'User already has a role in this condominium' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Assign role scoped to condominium
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({ user_id: userId, role, condominium_id })

    if (roleError) throw roleError

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
