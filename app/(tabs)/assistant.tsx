import Config from '@/constants/config';
import useAuthStore from '@/store/useAuthStore';
import { useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Technology = { nombre: string; beneficio: string };
type AssistantAnswer = {
  respuesta: string;
  tecnologias: Technology[];
  siguientePregunta: string;
};
type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  answer?: AssistantAnswer;
};

const initialMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! Puedo responder preguntas sobre el parqueadero y tecnologías de Industria 5.0. ¿Qué te gustaría saber?',
};

export default function AssistantScreen() {
  const { getAuthHeaders } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const sendQuestion = async () => {
    const text = question.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: text,
    };
    const previousMessages = messages.filter((message) => message.id !== 'welcome');
    setMessages((current) => [...current, userMessage]);
    setQuestion('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${Config.API_BASE_URL.replace(/\/eficient-parking-lot\/?$/, '')}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          question: text,
          history: previousMessages.slice(-10).map((message) => ({
            role: message.role,
            content: message.role === 'assistant' && message.answer
              ? JSON.stringify(message.answer).slice(0, 1200)
              : message.content.slice(0, 1200),
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudo obtener una respuesta.');
      }

      const answer: AssistantAnswer = {
        respuesta: data.respuesta,
        tecnologias: data.tecnologias,
        siguientePregunta: data.siguientePregunta,
      };
      setMessages((current) => [...current, {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: answer.respuesta,
        answer,
      }]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'No se pudo conectar con el asistente.');
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.message, isUser ? styles.userMessage : styles.assistantMessage]}>
        <Text style={[styles.messageLabel, isUser && styles.userLabel]}>
          {isUser ? 'Tú' : 'Asistente Industria 5.0'}
        </Text>
        <Text style={[styles.messageText, isUser && styles.userText]}>{item.content}</Text>
        {!!item.answer?.tecnologias.length && (
          <View style={styles.technologyList}>
            {item.answer.tecnologias.map((technology, index) => (
              <View key={`${technology.nombre}-${index}`} style={styles.technologyCard}>
                <Text style={styles.technologyName}>{technology.nombre}</Text>
                <Text style={styles.technologyBenefit}>{technology.beneficio}</Text>
              </View>
            ))}
          </View>
        )}
        {!!item.answer?.siguientePregunta && (
          <Text style={styles.followUp}>Para continuar: {item.answer.siguientePregunta}</Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerIcon}><Text style={styles.headerIconText}>✨</Text></View>
        <View style={styles.headerTexts}>
          <Text style={styles.title}>Asistente IA</Text>
          <Text style={styles.subtitle}>Parqueadero inteligente · Industria 5.0</Text>
        </View>
      </View>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      />
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator color="#0a7ea4" />
          <Text style={styles.loadingText}>Preparando respuesta...</Text>
        </View>
      )}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Escribe tu pregunta"
          style={styles.input}
          value={question}
          onChangeText={setQuestion}
          placeholder="Escribe tu pregunta..."
          placeholderTextColor="#748094"
          multiline
          maxLength={1200}
          editable={!loading}
          onSubmitEditing={sendQuestion}
          blurOnSubmit={false}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar pregunta"
          style={[styles.sendButton, (!question.trim() || loading) && styles.disabledButton]}
          onPress={sendQuestion}
          disabled={!question.trim() || loading}
        >
          <Text style={styles.sendText}>Enviar</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fb' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#0f3d5e' },
  headerIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  headerIconText: { fontSize: 22 },
  headerTexts: { flex: 1 },
  title: { color: '#fff', fontSize: 24, lineHeight: 30, fontWeight: '800' },
  subtitle: { marginTop: 2, color: '#c9dff0', fontSize: 13 },
  messages: { padding: 16, gap: 12 },
  message: { maxWidth: '92%', borderRadius: 18, padding: 14 },
  userMessage: { alignSelf: 'flex-end', backgroundColor: '#0a7ea4' },
  assistantMessage: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e8ef' },
  messageLabel: { marginBottom: 6, color: '#0a7ea4', fontSize: 12, fontWeight: '700' },
  userLabel: { color: '#dff7ff' },
  messageText: { color: '#243447', fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  technologyList: { gap: 8, marginTop: 10 },
  technologyCard: { padding: 10, borderRadius: 10, backgroundColor: '#eef6f8' },
  technologyName: { color: '#12556a', fontSize: 13, fontWeight: '700' },
  technologyBenefit: { marginTop: 3, color: '#34495e', fontSize: 13, lineHeight: 19 },
  followUp: { marginTop: 10, color: '#496273', fontSize: 13, fontStyle: 'italic' },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 8 },
  loadingText: { color: '#526274', fontSize: 13 },
  error: { paddingHorizontal: 16, paddingBottom: 8, color: '#b42318', fontSize: 13 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e1e8ef' },
  input: { flex: 1, maxHeight: 110, minHeight: 44, paddingHorizontal: 14, paddingVertical: 11, color: '#243447', borderWidth: 1, borderColor: '#cbd5df', borderRadius: 14, fontSize: 15 },
  sendButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#0a7ea4' },
  disabledButton: { opacity: 0.5 },
  sendText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
