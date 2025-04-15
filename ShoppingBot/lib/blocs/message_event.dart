import 'package:equatable/equatable.dart';

abstract class MessageEvent extends Equatable {
  const MessageEvent();

  @override
  List<Object> get props => [];
}

class SendMessageEvent extends MessageEvent {
  final String message;
  final String model;

  const SendMessageEvent({
    required this.message,
    required this.model,
  });

  @override
  List<Object> get props => [message, model];
}
