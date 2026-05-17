import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { conversation_id, content, message_type = 'text', image_url, recipient_id } = body;

    if (!conversation_id || (!content && !image_url)) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Create message
    const message = await base44.entities.Message.create({
      conversation_id,
      sender_id: user.id,
      content: content || '',
      message_type,
      image_url: image_url || '',
      status: 'sent',
      read_by: [user.id],
    });

    // Update conversation last message
    await base44.entities.Conversation.update(conversation_id, {
      last_message: message_type === 'image' ? '📷 Image' : content,
      last_message_time: now,
      last_message_sender_id: user.id,
    });

    // Create notification for recipient
    if (recipient_id) {
      await base44.entities.Notification.create({
        recipient_id,
        sender_id: user.id,
        conversation_id,
        message_preview: message_type === 'image' ? '📷 Image' : (content?.substring(0, 50) || ''),
        is_read: false,
        notification_type: 'new_message',
      });
    }

    return Response.json({ ok: true, message });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
