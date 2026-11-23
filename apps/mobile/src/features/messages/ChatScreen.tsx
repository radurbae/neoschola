import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { Message, MessageThread } from "@neoschola/shared";
import {
  Screen,
  Input,
  Button,
  Avatar,
  Alert,
  StateView,
} from "../../components/ui";
import { useAuth } from "../../store/auth";
import * as api from "../../lib/api";
import {
  shadcn,
  spacing,
  radius,
  typography,
  touchTarget,
} from "../../theme/tokens";

export function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [thread, setThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Input kirim pesan
  const [inputContent, setInputContent] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const loadThreadAndMessages = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.getThreadMessages(id);
      setMessages(res.messages || []);
      if (res.thread) {
        setThread(res.thread);
      }
      // Tandai percakapan telah dibaca
      api.markThreadRead(id).catch(() => {});
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Gagal memuat pesan. Periksa koneksi internet Anda."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadThreadAndMessages();
  }, [loadThreadAndMessages]);

  // Scroll otomatis ke paling bawah saat pesan bertambah
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!id || !inputContent.trim() || sending) return;

    const contentToSend = inputContent.trim();
    setInputContent("");
    setSending(true);

    try {
      const res = await api.sendThreadMessage(id, { content: contentToSend });
      setMessages((prev) => [...prev, res.message]);
    } catch {
      // Kembalikan teks jika gagal kirim
      setInputContent(contentToSend);
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Screen scroll={false} headerShown={false}>
      {/* Header Percakapan Hairline shadcn.background dengan tombol kembali 44x44pt + Avatar sm + subjek */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Kembali ke daftar pesan"
        >
          <Ionicons name="arrow-back" size={20} color={shadcn.foreground} />
        </TouchableOpacity>

        <Avatar
          name={thread?.teacher_name || "Wali Kelas"}
          size="sm"
          style={styles.headerAvatar}
        />

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {thread?.subject || "Ruang Percakapan"}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {thread
              ? `${thread.teacher_name || "Wali Kelas"} - Siswa: ${
                  thread.student_name || "Siswa"
                }`
              : "Memuat informasi..."}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        {/* Area Pesan */}
        {loading ? (
          <StateView type="loading" message="Memuat isi percakapan..." />
        ) : errorMessage ? (
          <StateView
            type="error"
            title="Gagal Memuat Pesan"
            message={errorMessage}
            actionLabel="Coba Lagi"
            onAction={loadThreadAndMessages}
          />
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Notifikasi Monokrom Resmi Percakapan */}
            {thread && (
              <Alert
                variant="default"
                title="Percakapan Resmi Sekolah"
                description={`Percakapan langsung terpantau dengan ${
                  thread.teacher_name || "Wali Kelas"
                } terkait siswa asuh ${thread.student_name || "Siswa"}.`}
                icon={
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={shadcn.foreground}
                  />
                }
                style={styles.threadAlert}
              />
            )}

            {messages.length === 0 ? (
              <View style={styles.emptyMessagesBox}>
                <Text style={styles.emptyMessagesText}>
                  Belum ada pesan dalam percakapan ini. Kirim pesan pertama Anda di bawah.
                </Text>
              </View>
            ) : (
              messages.map((msg) => {
                const isMyMessage = msg.sender_id === user?.id;
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.bubbleRow,
                      isMyMessage ? styles.bubbleRowMy : styles.bubbleRowPartner,
                    ]}
                  >
                    <View
                      style={[
                        styles.bubbleCard,
                        isMyMessage
                          ? styles.bubbleCardMy
                          : styles.bubbleCardPartner,
                      ]}
                    >
                      {/* Nama Pengirim pada lawan bicara */}
                      {!isMyMessage && Boolean(msg.sender_name) && (
                        <Text style={styles.senderNameText}>
                          {msg.sender_name}
                        </Text>
                      )}

                      {/* Teks Pesan */}
                      <Text
                        style={[
                          styles.messageText,
                          isMyMessage
                            ? styles.messageTextMy
                            : styles.messageTextPartner,
                        ]}
                      >
                        {msg.content}
                      </Text>

                      {/* Waktu Pesan & Tanda Terkirim */}
                      <View style={styles.bubbleFooter}>
                        <Text
                          style={[
                            styles.messageTimeText,
                            isMyMessage
                              ? styles.messageTimeTextMy
                              : styles.messageTimeTextPartner,
                          ]}
                        >
                          {formatMessageTime(msg.created_at)}
                        </Text>
                        {isMyMessage && (
                          <Ionicons
                            name="checkmark-done"
                            size={14}
                            color={shadcn.primaryForeground}
                            style={styles.checkIcon}
                          />
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Composer Bawah shadcn.background dengan border top shadcn.border, Input, dan Button default */}
        <View style={styles.composerBar}>
          <View style={styles.composerInputCol}>
            <Input
              placeholder="Ketik pesan untuk guru..."
              value={inputContent}
              onChangeText={setInputContent}
              containerStyle={styles.inputContainer}
              inputStyle={styles.inputField}
              accessibilityLabel="Tulis pesan untuk guru"
            />
          </View>
          <Button
            variant="default"
            size="icon"
            loading={sending}
            disabled={!inputContent.trim() || sending}
            onPress={handleSendMessage}
            leftIcon={
              <Ionicons
                name="send"
                size={18}
                color={shadcn.primaryForeground}
              />
            }
            accessibilityLabel="Kirim pesan sekarang"
            style={styles.sendButton}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: shadcn.background,
    borderBottomWidth: 1,
    borderBottomColor: shadcn.border,
  },
  backButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  headerAvatar: {
    marginRight: spacing.sm,
  },
  headerTitleCol: {
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    letterSpacing: typography.tracking.snug,
  },
  headerSubtitle: {
    fontSize: typography.size.xs,
    color: shadcn.mutedForeground,
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: shadcn.canvas,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
    paddingBottom: spacing.lg,
  },
  threadAlert: {
    marginBottom: spacing.lg,
  },
  emptyMessagesBox: {
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyMessagesText: {
    fontSize: typography.size.sm,
    color: shadcn.mutedForeground,
    textAlign: "center",
    lineHeight: typography.lineHeight.sm,
  },
  bubbleRow: {
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  bubbleRowMy: {
    justifyContent: "flex-end",
  },
  bubbleRowPartner: {
    justifyContent: "flex-start",
  },
  bubbleCard: {
    maxWidth: "80%",
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  // Pesan Sendiri: shadcn.primary teks shadcn.primaryForeground
  bubbleCardMy: {
    backgroundColor: shadcn.primary,
    borderBottomRightRadius: 2,
  },
  // Pesan Lawan Bicara: shadcn.secondary teks shadcn.foreground border shadcn.border
  bubbleCardPartner: {
    backgroundColor: shadcn.secondary,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: shadcn.border,
  },
  senderNameText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: shadcn.foreground,
    marginBottom: 2,
  },
  messageText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm + 2,
  },
  messageTextMy: {
    color: shadcn.primaryForeground,
  },
  messageTextPartner: {
    color: shadcn.foreground,
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 4,
  },
  messageTimeText: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  messageTimeTextMy: {
    color: shadcn.primaryForeground,
    opacity: 0.75,
  },
  messageTimeTextPartner: {
    color: shadcn.mutedForeground,
  },
  checkIcon: {
    marginLeft: 2,
    opacity: 0.85,
  },

  // Composer Bawah
  composerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: shadcn.background,
    borderTopWidth: 1,
    borderTopColor: shadcn.border,
    gap: spacing.sm,
  },
  composerInputCol: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 0,
  },
  inputField: {
    minHeight: touchTarget.minHeight,
    paddingVertical: 8,
  },
  sendButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
  },
});
