import 'package:equatable/equatable.dart';

import '../chatmessage.dart';

abstract class MessageState extends Equatable {
  const MessageState();

  @override
  List<Object> get props => [];
}

class MessageInitial extends MessageState {}

class MessageSending extends MessageState {}

class MessageSent extends MessageState {
  final ChatMessage message;

  const MessageSent(this.message);

  @override
  List<Object> get props => [message];
}

class MessageError extends MessageState {
  final String error;

  const MessageError(this.error);

  @override
  List<Object> get props => [error];
}
