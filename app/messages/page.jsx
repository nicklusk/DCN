'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { Suspense } from 'react'

function MessagesInner() {
  const [user, setUser] = useState(null)
  const [conversations, setConversations] = useState([])
  const [activeConvo, setActiveConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchConversations(user.id)

      const withUserId = searchParams.get('with')
      if (withUserId) openConversation(withUserId, user.id)

      setLoading(false)

      const channel = supabase
        .channel(`messages-${user.id}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            if (payload.new.recipient_id === user.id ||
                payload.new.sender_id === user.id) {
              fetchConversations(user.id)
              if (activeConvo) fetchMessages(user.id, activeConvo.other_user_id)
            }
          }
        )
        .subscribe()

      return () => supabase.removeChannel(channel)
    }
    init()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchConversations = async (userId) => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:sender_id(id, full_name, avatar_url), recipient:recipient_id(id, full_name, avatar_url)')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (!data) return

    const seen = new Set()
    const convos = []
    data.forEach(msg => {
      const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id
      const otherUser = msg.sender_id === userId ? msg.recipient : msg.sender
      if (!seen.has(otherId)) {
        seen.add(otherId)
        convos.push({
          other_user_id: otherId,
          other_user: otherUser,
          last_message: msg.content,
          last_time: msg.created_at,
          unread: !msg.read && msg.recipient_id === userId,
        })
      }
    })
    setConversations(convos)
  }

  const openConversation = async (otherUserId, userId) => {
    const { data: otherUser } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', otherUserId)
      .single()

    setActiveConvo({ other_user_id: otherUserId, other_user: otherUser })
    await fetchMessages(userId || user?.id, otherUserId)

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', otherUserId)
      .eq('recipient_id', userId || user?.id)
  }

  const fetchMessages = async (userId, otherUserId) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
      .order('created_at', { ascending: true })

    setMessages(data || [])
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConvo || sending) return
    setSending(true)

    await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: activeConvo.other_user_id,
      content: newMessage.trim(),
    })

    setNewMessage('')
    await fetchMessages(user.id, activeConvo.other_user_id)
    await fetchConversations(user.id)
    setSending(false)
  }

  const formatTime = (ts) => {
    const d = new Date(ts)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    return isToday
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const initials = (name) => (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  if (loading) return (
    <div style={s.centered}><p style={s.muted}>Loading messages...</p></div>
  )

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.push('/browse')}>← Browse</button>
        <span style={s.title}>Messages</span>
        <span />
      </div>

      <div style={s.layout}>
        {/* Conversation list */}
        <div style={s.sidebar}>
          {conversations.length === 0 ? (
            <div style={s.emptyConvo}>
              <p style={s.muted}>No messages yet.</p>
              <p style={s.muted} >Reserve a cable to start a conversation.</p>
            </div>
          ) : (
            conversations.map(convo => (
              <div
                key={convo.other_user_id}
                style={activeConvo?.other_user_id === convo.other_user_id
                  ? { ...s.convoItem, ...s.convoActive }
                  : s.convoItem}
                onClick={() => openConversation(convo.other_user_id, user.id)}
              >
                {convo.other_user?.avatar_url ? (
                  <Image
                    src={convo.other_user.avatar_url}
                    alt={convo.other_user.full_name}
                    width={40} height={40}
                    style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={s.convoAvatar}>
                    {initials(convo.other_user?.full_name)}
                  </div>
                )}
                <div style={s.convoInfo}>
                  <div style={s.convoName}>
                    {convo.other_user?.full_name || 'Unknown'}
                    {convo.unread && <span style={s.unreadDot} />}
                  </div>
                  <div style={s.convoLast}>{convo.last_message}</div>
                </div>
                <div style={s.convoTime}>{formatTime(convo.last_time)}</div>
              </div>
            ))
          )}
        </div>

        {/* Message thread */}
        <div style={s.thread}>
          {!activeConvo ? (
            <div style={s.noConvo}>
              <p style={s.muted}>Select a conversation</p>
            </div>
          ) : (
            <>
              <div style={s.threadHeader}>
                <div style={s.threadName}
                  onClick={() => router.push(`/profile/${activeConvo.other_user_id}`)}>
                  {activeConvo.other_user?.avatar_url ? (
                    <Image
                      src={activeConvo.other_user.avatar_url}
                      alt={activeConvo.other_user.full_name}
                      width={32} height={32}
                      style={{ borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
                    />
                  ) : (
                    <div style={{ ...s.convoAvatar, width: 32, height: 32, fontSize: 12 }}>
                      {initials(activeConvo.other_user?.full_name)}
                    </div>
                  )}
                  <span style={{ cursor: 'pointer', color: 'var(--text-primary)', fontSize: 15, fontWeight: 500 }}>
                    {activeConvo.other_user?.full_name}
                  </span>
                </div>
              </div>

              <div style={s.messageList}>
                {messages.map(msg => {
                  const isMine = msg.sender_id === user.id
                  return (
                    <div key={msg.id} style={isMine ? s.bubbleRowMine : s.bubbleRow}>
                      <div style={isMine ? s.bubbleMine : s.bubbleTheirs}>
                        {msg.content}
                      </div>
                      <div style={s.bubbleTime}>{formatTime(msg.created_at)}</div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              <div style={s.inputRow}>
                <input
                  style={s.messageInput}
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                />
                <button
                  style={sending || !newMessage.trim() ? s.sendBtnDisabled : s.sendBtn}
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui', color: '#888' }}>Loading...</div>}>
      <MessagesInner />
    </Suspense>
  )
}

const s = {
  page: { maxWidth: 720, margin: '0 auto', padding: '0 16px 60px', fontFamily: 'system-ui, sans-serif' },
  centered: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'system-ui' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: 20 },
  backBtn: { background: 'none', border: 'none', fontSize: 15, color: '#2a7c4f', cursor: 'pointer', fontFamily: 'inherit' },
  title: { fontSize: 17, fontWeight: 500, color: 'var(--text-primary)' },
  layout: { display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', minHeight: 500 },
  sidebar: { width: 220, borderRight: '1px solid var(--border)', flexShrink: 0, overflowY: 'auto' },
  emptyConvo: { padding: 20, display: 'flex', flexDirection: 'column', gap: 6 },
  convoItem: { display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px', cursor: 'pointer', borderBottom: '0.5px solid var(--border)' },
  convoActive: { background: 'var(--surface-1)' },
  convoAvatar: { width: 40, height: 40, borderRadius: '50%', background: '#cde9d9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 500, color: '#1a5c36', flexShrink: 0 },
  convoInfo: { flex: 1, minWidth: 0 },
  convoName: { fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 },
  convoLast: { fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 },
  convoTime: { fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 },
  unreadDot: { width: 7, height: 7, borderRadius: '50%', background: '#2a7c4f', display: 'inline-block' },
  thread: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  noConvo: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  threadHeader: { padding: '12px 16px', borderBottom: '0.5px solid var(--border)', background: 'var(--surface-2)' },
  threadName: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
  messageList: { flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 300, maxHeight: 400 },
  bubbleRow: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 },
  bubbleRowMine: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 },
  bubbleTheirs: { background: 'var(--surface-1)', border: '0.5px solid var(--border)', borderRadius: '12px 12px 12px 4px', padding: '10px 14px', fontSize: 14, color: 'var(--text-primary)', maxWidth: '75%', lineHeight: 1.5 },
  bubbleMine: { background: '#2a7c4f', borderRadius: '12px 12px 4px 12px', padding: '10px 14px', fontSize: 14, color: '#fff', maxWidth: '75%', lineHeight: 1.5 },
  bubbleTime: { fontSize: 11, color: 'var(--text-muted)' },
  inputRow: { display: 'flex', gap: 8, padding: 12, borderTop: '0.5px solid var(--border)' },
  messageInput: { flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-strong)', fontSize: 14, fontFamily: 'inherit', background: 'var(--surface-2)', color: 'var(--text-primary)', outline: 'none' },
  sendBtn: { background: '#2a7c4f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  sendBtnDisabled: { background: '#a8d5bc', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, cursor: 'not-allowed', fontFamily: 'inherit' },
  muted: { color: 'var(--text-secondary)', fontSize: 14 },
}