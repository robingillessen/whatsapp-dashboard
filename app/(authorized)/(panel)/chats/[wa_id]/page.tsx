'use client';

import { useEffect, useState, useCallback } from "react";
import { DBTables } from "@/lib/enums/Tables";
import ChatHeader from "./ChatHeader";
import MessageListClient from "./MessageListClient";
import SendMessageWrapper from "./SendMessageWrapper";
import { useSupabase } from "@/components/supabase-provider";
import ContactBrowserFactory from "@/lib/repositories/contacts/ContactBrowserFactory";
import { Contact } from "@/types/contact";
import { Button } from "@/components/ui/button";
import TemplateSelection from "@/components/ui/template-selection";
import { TemplateRequest } from "@/types/message-template-request";
import TWLoader from "@/components/TWLoader";
import { CircleAlertIcon } from "lucide-react";
import { UPDATE_CURRENT_CONTACT, useCurrentContactDispatch } from "../CurrentContactContext";
import { isLessThanADay } from "@/lib/time-utils";
import { UIMessageModel } from "@/types/Message";
import { useSupabaseUser } from "@/components/supabase-user-provider"

export const revalidate = 0;

export default function ContactChat({ params }: { params: { wa_id: string } }) {
  const { supabase } = useSupabase();
  const setCurrentContact = useCurrentContactDispatch();
  const { session } = useSupabaseUser()
  const [contact, setContact] = useState<Contact | undefined>();
  const [lastMessageReceivedAt, setLastMessageReceivedAt] = useState<Date | undefined>();
  const [isChatWindowOpen, setChatWindowOpen] = useState<boolean | undefined>();
  const [messages, setMessages] = useState<UIMessageModel[]>([]);
  const [isFetchingContact, setIsFetchingContact] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [messageTemplateSending, setMessageTemplateSending] = useState(false);

  const contactRepository = ContactBrowserFactory.getInstance(supabase);

  const addOptimisticMessage = (msg: UIMessageModel) => {
    setMessages(prev => [...prev, msg]);
  };

  useEffect(() => {
    const fetchContact = async () => {
      setIsFetchingContact(true);
      try {
        const contact = await contactRepository.getContactById(params.wa_id);
        if (contact) {
          setContact(contact);
          setLastMessageReceivedAt(contact.last_message_received_at ? new Date(contact.last_message_received_at) : undefined);
          if (setCurrentContact) {
            setCurrentContact({ type: UPDATE_CURRENT_CONTACT, contact });
          }
        } else {
          setContact(undefined);
        }
      } catch (error) {
        console.error("Error fetching contact:", error);
        setHasError(true);
      } finally {
        setIsFetchingContact(false);
      }
    };

    fetchContact();
  }, [params.wa_id]);

  useEffect(() => {
    setChatWindowOpen(lastMessageReceivedAt ? isLessThanADay(lastMessageReceivedAt) : false);
  }, [lastMessageReceivedAt]);

  useEffect(() => {
    supabase.realtime.setAuth(session?.access_token ?? null)
    const channel = supabase
      .channel('last-message-received-channel')
      .on<Contact>('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'contacts',
        filter: `wa_id=eq.${params.wa_id}`,
      }, (payload) => {
        if (payload.new.last_message_received_at) {
          setLastMessageReceivedAt(new Date(payload.new.last_message_received_at));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.wa_id]);

  const onTemplateSubmit = useCallback(async (req: TemplateRequest) => {
    setMessageTemplateSending(true);
    const formData = new FormData();
    formData.set("to", params.wa_id);
    formData.set("template", JSON.stringify(req));

    try {
      const response = await fetch("/api/sendMessage", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to send template:", error);
    } finally {
      setMessageTemplateSending(false);
    }
  }, [params.wa_id]);

  const renderContent = () => {
    if (isFetchingContact) {
      return <div className="flex justify-center items-center h-full"><TWLoader className="w-10 h-10" /></div>;
    }

    if (hasError || (typeof contact === "undefined" && !isFetchingContact)) {
      return (
        <div className="flex flex-col justify-center items-center h-full gap-2 text-center">
          <CircleAlertIcon />
          <span className="text-lg">Chat does not exist or failed to load.</span>
        </div>
      );
    }

    return (
      <>
        <ChatHeader contact={contact!} />
        <MessageListClient from={params.wa_id} stateMessages={messages} setMessages={setMessages} />

        {typeof isChatWindowOpen !== 'undefined' && (
          isChatWindowOpen ? (
            <SendMessageWrapper waId={params.wa_id} addOptimisticMessage={addOptimisticMessage} setMessages={setMessages} />
          ) : (
            <div className="p-4 bg-white flex flex-row gap-4 items-center">
              <span className="text-sm">
                You can only send a message within 24 hours of the last customer interaction. Please wait until the customer reaches out to you again or send a template message.
                <a className="text-blue-500 ml-1" href="https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#customer-service-windows" target="_blank" rel="noopener noreferrer">Read more</a>
              </span>
              <TemplateSelection onTemplateSubmit={onTemplateSubmit}>
                <Button disabled={messageTemplateSending}>
                  {messageTemplateSending && <><TWLoader className="w-5 h-5 mr-2" /> </>}
                  Send template message
                </Button>
              </TemplateSelection>
            </div>
          )
        )}
      </>
    );
  };

  return (
    <div className="h-full flex flex-row">
      <div className="bg-conversation-panel-background h-full relative flex-grow">
        <div className="bg-chat-img h-full w-full absolute bg-[length:412.5px_749.25px] opacity-40"></div>
        <div className="h-full relative flex flex-col">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
