import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { is_online } = body;
    const now = new Date().toISOString();

    const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (profiles && profiles.length > 0) {
      await base44.entities.UserProfile.update(profiles[0].id, {
        is_online: is_online !== false,
        last_seen: now,
      });
    } else {
      await base44.entities.UserProfile.create({
        user_id: user.id,
        username: user.full_name || user.email?.split('@')[0] || 'User',
        email: user.email,
        is_online: is_online !== false,
        last_seen: now,
        bio: '',
        profile_picture: '',
      });
    }

    return Response.json({ ok: true, last_seen: now });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
