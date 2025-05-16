'use client'

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { DBTables } from "@/lib/enums/Tables"
import { MessageJson, TemplateMessage, TextMessage } from "@/types/Message"
import ReceivedImageMessageUI from "./ReceivedImageMessageUI"
import ReceivedTextMessageUI from "./ReceivedTextMessageUI"
import TailWrapper from "./TailWrapper"
import ReceivedTemplateMessageUI from "./ReceivedTemplateMessageUI"
import { markAsRead } from "./markAsRead"
import ReceivedVideoMessageUI from "./ReceivedVideoMessageUI"
import ReceivedDocumentMessageUI from "./ReceivedDocumentMessageUI"
import { useSupabase } from "@/components/supabase-provider"

type UIMessageModel = DBMessage & {
    msgDate: string
}

function addDateToMessages(withoutDateArray: DBMessage[]): UIMessageModel[] {
    return withoutDateArray.map((messageWithoutDate) => ({
        ...messageWithoutDate,
        msgDate: new Date(messageWithoutDate.created_at).toLocaleDateString()
    }))
}

export default function MessageListClient({ from }: { from: string }) {
    const { supabase } = useSupabase()
    const [stateMessages, setMessages] = useState<UIMessageModel[]>(addDateToMessages([]))
    const [additionalMessagesLoading, setAdditionalMessagesLoading] = useState<boolean>(false)
    const [noMoreMessages, setNoMoreMessages] = useState<boolean>(false)
    const [newMessageId, setNewMessageId] = useState<number | undefined>()
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = (bottom: number = 0) => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight - bottom
        }
    }

    async function fetchMessages(before: string | null = null) {
        const query = supabase
            .from(DBTables.Messages)
            .select('*')
            .eq('chat_id', from)
            .limit(1000)
            .order('created_at', { ascending: false })

        if (before) query.lt('created_at', before)

        const { data: messages, error } = await query
        if (error) throw error
        return messages
    }

    function markAsReadUnreadMessages(messages: DBMessage[]) {
        const unreadReceivedMessages = messages.filter(m => m.is_received && m.read_by_user_at === null).map(m => m.id)
        if (unreadReceivedMessages.length > 0) {
            markAsRead({ messageIds: unreadReceivedMessages, chatId: from }).catch(console.error)
        }
        if (messages.length === 0) {
            setNoMoreMessages(true)
        }
    }

    useEffect(() => {
        const channel = supabase
            .channel('message-events')
            .on<DBMessage>('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: DBTables.Messages,
                filter: `chat_id=eq.${from}`
            }, payload => {
                setMessages(prev => {
                    const updated = [...prev, ...addDateToMessages([payload.new])]
                    setTimeout(() => scrollToBottom(), 100)
                    return updated
                })

                if (payload.new.is_received && payload.new.read_by_user_at === null) {
                    markAsRead({
                        messageIds: [payload.new.id],
                        chatId: from
                    }).catch(console.error)
                }
            })
            .on<DBMessage>('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: DBTables.Messages,
                filter: `created_at=gte.${stateMessages[0]?.created_at ?? ''}`
            }, payload => {
                setMessages(prev => {
                    const idx = prev.findIndex(m => m.wam_id === payload.new.wam_id)
                    if (idx !== -1) {
                        const updated = [...prev]
                        updated[idx] = addDateToMessages([payload.new])[0]
                        return updated
                    }
                    return prev
                })
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, from, stateMessages])

    useEffect(() => {
        (async () => {
            const messages = await fetchMessages()
            markAsReadUnreadMessages(messages)
            let unreadId: number | undefined

            for (let i = 0; i < messages.length; i++) {
                if (messages[i].is_received && messages[i].read_by_user_at === null) {
                    unreadId = messages[i].id
                } else {
                    break
                }
            }

            messages.reverse()
            const addedDates = addDateToMessages(messages)
            if (unreadId) setNewMessageId(unreadId)
            setMessages(addedDates)
            setTimeout(() => scrollToBottom(), 100)
        })()
    }, [supabase, from])

    async function loadAdditionalMessages() {
        if (stateMessages.length > 0 && stateMessages[0].created_at && messagesEndRef.current) {
            const additionalMessages = await fetchMessages(stateMessages[0].created_at)
            markAsReadUnreadMessages(additionalMessages)
            additionalMessages.reverse()
            const addedDates = addDateToMessages(additionalMessages)
            const scrollBottom = messagesEndRef.current.scrollHeight - messagesEndRef.current.scrollTop
            setMessages(prev => [...addedDates, ...prev])
            setAdditionalMessagesLoading(false)
            setTimeout(() => scrollToBottom(scrollBottom), 100)
        }
    }

    const onDivScroll = async () => {
        if (!additionalMessagesLoading && !noMoreMessages && messagesEndRef.current?.scrollTop && messagesEndRef.current.scrollTop < 100) {
            setAdditionalMessagesLoading(true)
            await loadAdditionalMessages()
        }
    }

    return (
        <div className="px-16 py-2 overflow-y-auto h-full" ref={messagesEndRef} onScroll={onDivScroll}>
            {stateMessages.map((message, index) => {
                const messageBody = message.message as MessageJson
                const messageDateTime = new Date(message.created_at)

                return (
                    <div key={message.id}>
                        {index === 0 || message.msgDate !== stateMessages[index - 1].msgDate ? (
                            <div className="flex justify-center ">
                                <span className="p-2 rounded-md bg-system-message-background text-system-message-text text-sm">{message.msgDate}</span>
                            </div>
                        ) : null}

                        {newMessageId && message.id === newMessageId ? (
                            <div className="flex justify-center ">
                                <span className="p-2 rounded-md bg-system-message-background text-system-message-text text-sm">Unread messages</span>
                            </div>
                        ) : null}

                        <div className="my-1">
                            <TailWrapper showTail={index === 0 ? true : stateMessages[index].message.from !== stateMessages[index - 1].message.from} isSent={!!messageBody.to}>
                                <div className="px-2 pt-2 flex flex-col items-end gap-1 relative">
                                    <div className="pb-2 inline-block">
                                        {(() => {
                                            switch (messageBody.type) {
                                                case "text":
                                                    return <ReceivedTextMessageUI textMessage={messageBody as TextMessage} />
                                                case "image":
                                                    return <ReceivedImageMessageUI message={message} />
                                                case "video":
                                                    return <ReceivedVideoMessageUI message={message} />
                                                case "template":
                                                    return <ReceivedTemplateMessageUI message={messageBody as TemplateMessage} />
                                                case "document":
                                                    return <ReceivedDocumentMessageUI message={message} />
                                                default:
                                                    return <div>Unsupported message</div>
                                            }
                                        })()}
                                        <span className="invisible">ww:ww wm</span>
                                    </div>
                                    <span className="text-xs pb-2 pe-2 text-bubble-meta absolute bottom-0 end-0">{messageDateTime.toLocaleTimeString().toLowerCase()}</span>
                                </div>
                            </TailWrapper>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
