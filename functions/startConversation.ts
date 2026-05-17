import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { recipient_id } = body;

    if (!recipient_id) {
      return Response.json({ error: 'recipient_id is required' }, { status: 400 });
    }

    if (recipient_id === user.id) {
      return Response.json({ error: 'Cannot start conversation with yourself' }, { status: 400 });
    }

    // Check if conversation already exists
    const allConvs = await base44.entities.Conversation.list();
    const existing = allConvs.find(c => 
      c.participant_ids && 
      c.participant_ids.includes(user.id) && 
      c.participant_ids.includes(recipient_id) &&
      c.participant_ids.length === 2
    );

    if (existing) {
      return Response.json({ ok: true, conversation: existing, existed: true });
    }

    // Create new conversation
    const conversation = await base44.entities.Conversation.create({
      participant_ids: [user.id, recipient_id],
      last_message: '',
      last_message_time: new Date().toISOString(),
      last_message_sender_id: '',
      unread_count: {},
    });

    return Response.json({ ok: true, conversation, existed: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
