'use client';

import { Dispatch, SetStateAction, useCallback, useState } from "react";
import SendMessageUI, { FileType } from "./SendMessageUI";
import { TemplateRequest } from "@/types/message-template-request";
import { UIMessageModel, MessageJson } from "@/types/Message";

interface SendMessageWrapperProps {
    waId: string
    addOptimisticMessage: (message: UIMessageModel) => void
    setMessages: Dispatch<SetStateAction<UIMessageModel[]>>
}

export default function SendMessageWrapper({ waId, addOptimisticMessage, setMessages }: SendMessageWrapperProps) {
    const [message, setMessage] = useState<string>('');
    const [fileType, setFileType] = useState<FileType | undefined>();
    const [file, setFile] = useState<File | undefined>();

    const onMessageSend = useCallback(async () => {
        const trimmed = message.trim();
        if (!trimmed && !file) return;

        const tempId = Date.now();
        const now = new Date();

        let optimisticMessage: UIMessageModel;
        if (fileType === undefined || String(fileType) === 'text') {
            // Text message: type safe
            const optimisticMsgJson: MessageJson & { text: { body: string } } = {
                id: String(tempId),
                from: "me",
                to: waId,
                timestamp: now.toISOString(),
                type: "text",
                text: { body: trimmed },
            };
            optimisticMessage = {
                id: tempId,
                chat_id: Number(waId),
                is_received: false,
                created_at: now.toISOString(),
                msgDate: now.toLocaleDateString(),
                wam_id: String(tempId),
                read_by_user_at: null,
                delivered_at: null,
                media_url: null,
                read_at: null,
                sent_at: null,
                message: optimisticMsgJson,
                isPending: true,
            };
        } else {
            // TODO: Implement optimistic updates for other file types (image, video, etc.)
            return;
        }

        addOptimisticMessage(optimisticMessage);
        setMessage('');

        // 2. Doe de API-call
        const formData = new FormData();
        formData.set('to', waId);
        formData.set('message', trimmed);
        if (typeof file !== 'undefined' && typeof fileType !== 'undefined') {
            formData.set('fileType', fileType)
            formData.set('file', file)
        }
        const response = await fetch('/api/sendMessage', {
            method: 'POST',
            body: formData,
        })
        if (response.status === 200) {
            setFileType(undefined)
            setFile(undefined)
            // update the optimistic message to update the isPending to false
            setMessages(prevMessages => {
                const idx = prevMessages.findIndex(msg => msg.id === optimisticMessage.id);
                if (idx === -1) return prevMessages;
                const updated = [...prevMessages];
                updated[idx] = { ...updated[idx], isPending: false };
                return updated;
            });
        } else {
            console.log('error')
        }
    }, [waId, file, fileType, message, addOptimisticMessage]);

    const onTemplateMessageSend = useCallback(async (req: TemplateRequest) => {
        const formData = new FormData();
        formData.set('to', waId);
        formData.set('template', JSON.stringify(req));
        const response = await fetch('/api/sendMessage', {
            method: 'POST',
            body: formData,
        })
        if (response.status === 200) {
            console.log('successful')
        } else {
            throw new Error(`Request failed with status code ${response.status}`);
        }
    }, [waId])

    return (
        <SendMessageUI message={message} file={file} fileType={fileType} setMessage={setMessage} setFileType={setFileType} setFile={setFile} onMessageSend={onMessageSend} onTemplateMessageSend={onTemplateMessageSend} />
    )
}