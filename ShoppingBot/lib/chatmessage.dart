import 'package:flutter/material.dart';
import 'dart:async';

class ChatMessage extends StatefulWidget {
  const ChatMessage(
      {super.key,
      required this.text,
      required this.sender,
      this.isImage = false});

  final Stream<String> text;
  final String sender;
  final bool isImage;

  @override
  State<ChatMessage> createState() => _ChatMessageState();
}

class _ChatMessageState extends State<ChatMessage> {
  String _currentText = '';
  StreamSubscription<String>? _subscription;

  @override
  void initState() {
    super.initState();
    _subscription = widget.text.listen((data) {
      setState(() {
        _currentText += data;
      });
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: widget.sender == "user" 
                  ? Colors.red[200]
                  : Colors.green[200],
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              widget.sender,
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8.0),
              child: widget.isImage
                  ? AspectRatio(
                      aspectRatio: 16 / 9,
                      child: Image.network(
                        _currentText,
                        loadingBuilder: (context, child, loadingProgress) =>
                            loadingProgress == null
                                ? child
                                : const CircularProgressIndicator.adaptive(),
                      ),
                    )
                  : SelectableText(
                      _currentText.trim(),
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
