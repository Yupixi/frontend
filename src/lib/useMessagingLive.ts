import { useEffect, useRef, useState } from 'react'
import { useMutation, useSubscription } from '@apollo/client/react'
import {
  CONVERSATION_READ_SUBSCRIPTION,
  OFFER_UPDATED_SUBSCRIPTION,
  SET_TYPING_MUTATION,
  TYPING_STATUS_SUBSCRIPTION,
} from '../graphql/messaging'

const STOP_TYPING_AFTER_MS = 2500
const TYPING_INDICATOR_TIMEOUT_MS = 5000
// "Is typing" is re-announced at most this often while the user keeps typing
// (well under the other side's 5 s indicator timeout) — it used to be sent
// on every keystroke, one request per character.
const TYPING_REANNOUNCE_MS = 2000

export function useTypingIndicator(conversationId: string | null | undefined, otherParticipantId: string | undefined) {
  const [setTypingMutation] = useMutation(SET_TYPING_MUTATION)
  const [otherIsTyping, setOtherIsTyping] = useState(false)
  const stopSendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const clearIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastAnnouncedRef = useRef(0)

  // Otherwise onData's closure can compare against a stale value captured
  // on the first render if Apollo doesn't tear the subscription down on
  // every prop change — a ref sidesteps that entirely.
  const otherParticipantIdRef = useRef(otherParticipantId)
  otherParticipantIdRef.current = otherParticipantId

  useSubscription<{ typingStatus: { userId: string; isTyping: boolean } }>(TYPING_STATUS_SUBSCRIPTION, {
    variables: { conversationId: conversationId as string },
    skip: !conversationId,
    onData: ({ data }) => {
      const payload = data.data?.typingStatus
      if (!payload || payload.userId !== otherParticipantIdRef.current) return
      clearTimeout(clearIndicatorTimeoutRef.current)
      setOtherIsTyping(payload.isTyping)
      if (payload.isTyping) {
        clearIndicatorTimeoutRef.current = setTimeout(() => setOtherIsTyping(false), TYPING_INDICATOR_TIMEOUT_MS)
      }
    },
  })

  useEffect(() => {
    setOtherIsTyping(false)
  }, [conversationId])

  const notifyTyping = () => {
    if (!conversationId) return
    const now = Date.now()
    if (now - lastAnnouncedRef.current > TYPING_REANNOUNCE_MS) {
      lastAnnouncedRef.current = now
      void setTypingMutation({ variables: { conversationId, isTyping: true } })
    }
    clearTimeout(stopSendingTimeoutRef.current)
    stopSendingTimeoutRef.current = setTimeout(() => {
      lastAnnouncedRef.current = 0
      void setTypingMutation({ variables: { conversationId, isTyping: false } })
    }, STOP_TYPING_AFTER_MS)
  }

  const notifyStoppedTyping = () => {
    if (!conversationId) return
    clearTimeout(stopSendingTimeoutRef.current)
    lastAnnouncedRef.current = 0
    void setTypingMutation({ variables: { conversationId, isTyping: false } })
  }

  useEffect(() => {
    return () => {
      clearTimeout(stopSendingTimeoutRef.current)
      clearTimeout(clearIndicatorTimeoutRef.current)
    }
  }, [])

  return { otherIsTyping, notifyTyping, notifyStoppedTyping }
}

export function useConversationReadRefresh(conversationId: string | null | undefined, onRead: () => void) {
  const onReadRef = useRef(onRead)
  onReadRef.current = onRead

  useSubscription(CONVERSATION_READ_SUBSCRIPTION, {
    variables: { conversationId: conversationId as string },
    skip: !conversationId,
    onData: () => onReadRef.current(),
  })
}

export function useOfferUpdatedRefresh(conversationId: string | null | undefined, onUpdate: () => void) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useSubscription(OFFER_UPDATED_SUBSCRIPTION, {
    variables: { conversationId: conversationId as string },
    skip: !conversationId,
    onData: () => onUpdateRef.current(),
  })
}
