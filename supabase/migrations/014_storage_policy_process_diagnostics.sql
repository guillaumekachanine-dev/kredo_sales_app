-- ============================================================
--  KREDO — Migration 014 : Storage RLS — bucket process diagnostics
--
--  Le bucket 'ai_intelligence_process_diagnostics' est privé.
--  Sans policy, createSignedUrl échoue même côté serveur avec
--  la clé anon + session utilisateur.
--  Cette policy autorise les utilisateurs authentifiés à lire
--  (SELECT = générer des signed URLs) les objets du bucket.
-- ============================================================

CREATE POLICY "authenticated_read_process_diagnostics"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'ai_intelligence_process_diagnostics');
