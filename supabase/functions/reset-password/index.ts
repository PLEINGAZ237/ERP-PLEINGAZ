import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    console.log("[reset-pwd] 1. Auth header present:", !!authHeader)

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé : pas de token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: userData, error: userError } = await supabaseUser.auth.getUser()
    console.log("[reset-pwd] 2. getUser:", userData?.user?.id, "error:", userError?.message)

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Session invalide : " + (userError?.message || "user null") }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Vérifier rôle Admin via la table directement (plus fiable que RPC)
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from("utilisateur_roles")
      .select("role_id, roles(nom)")
      .eq("user_id", userData.user.id)
      .eq("roles.nom", "Admin")

    console.log("[reset-pwd] 3. Admin check:", JSON.stringify(adminCheck), "error:", adminError?.message)

    const isAdmin = (adminCheck ?? []).some(r => r.roles?.nom === "Admin")

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Accès refusé : rôle Admin requis" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { user_id, new_password } = await req.json()
    console.log("[reset-pwd] 4. Target user_id:", user_id, "pwd length:", new_password?.length)

    if (!user_id || !new_password) {
      return new Response(
        JSON.stringify({ error: "user_id et new_password requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Le mot de passe doit contenir au moins 6 caractères" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    )
    console.log("[reset-pwd] 5. updateUserById error:", updateError?.message)

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    await supabaseAdmin
      .from("profiles")
      .update({ mot_de_passe_change: false })
      .eq("id", user_id)

    console.log("[reset-pwd] 6. Success!")

    return new Response(
      JSON.stringify({ success: true, message: "Mot de passe réinitialisé avec succès" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (err) {
    console.error("[reset-pwd] CATCH:", err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})