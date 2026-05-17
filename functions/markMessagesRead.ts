import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { conversation_id } = body;

    if (!conversation_id) {
      return Response.json({ error: 'conversation_id is required' }, { status: 400 });
    }

    // Get all unread messages in this conversation not sent by current user
    const messages = await base44.entities.Message.filter({ conversation_id });
    const unreadMessages = messages.filter(m => 
      m.sender_id !== user.id && 
      (!m.read_by || !m.read_by.includes(user.id))
    );

    // Mark each as read
    for (const msg of unreadMessages) {
      const readBy = Array.isArray(msg.read_by) ? msg.read_by : [];
      if (!readBy.includes(user.id)) {
        await base44.entities.Message.update(msg.id, {
          status: 'read',
          read_by: [...readBy, user.id],
        });
      }
    }

    // Mark notifications as read
    const notifications = await base44.entities.Notification.filter({ 
      recipient_id: user.id,
      conversation_id,
      is_read: false 
    });
    for (const notif of notifications) {
      await base44.entities.Notification.update(notif.id, { is_read: true });
    }

    return Response.json({ ok: true, marked: unreadMessages.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
