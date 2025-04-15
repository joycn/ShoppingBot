import 'package:flutter_bloc/flutter_bloc.dart';
import 'dart:async';

import '../chatmessage.dart';
import '../services/api_service.dart';
import 'message_event.dart';
import 'message_state.dart';

class MessageBloc extends Bloc<MessageEvent, MessageState> {
  final ApiService _apiService;

  MessageBloc({required ApiService apiService}) 
      : _apiService = apiService,
        super(MessageInitial()) {
    on<SendMessageEvent>(_onSendMessage);
  }

  Future<void> _onSendMessage(
    SendMessageEvent event,
    Emitter<MessageState> emit,
  ) async {
    try {
      emit(MessageSending());

      // Create a StreamController for the user message
      final userStreamController = StreamController<String>();
      userStreamController.add(event.message);
      userStreamController.close();

      final userMessage = ChatMessage(
        text: userStreamController.stream,
        sender: "user",
      );
      emit(MessageSent(userMessage));

      // Get the stream from the API service
      final responseStream = _apiService.connectToSSE(
        message: event.message,
        model: event.model,
      );
      
      final botMessage = ChatMessage(
        text: responseStream,
        sender: "bot",
      );
      emit(MessageSent(botMessage));
    } catch (e) {
      emit(MessageError(e.toString()));
    }
  }
}
