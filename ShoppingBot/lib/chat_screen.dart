import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:logger/logger.dart';

import 'blocs/message_bloc.dart';
import 'blocs/message_event.dart';
import 'blocs/message_state.dart';
import 'chatmessage.dart';
import 'services/api_service.dart';
import 'threedots.dart';

final logger = Logger();

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final List<ChatMessage> _messages = [];
  bool _isTyping = false;

  String _selectedModel = "gpt-3.5-turbo";
  
  final List<String> _availableModels = [
    "gpt-4o-mini",
    "gpt-3.5-turbo",
    "gpt-4o",
  ];

  late final MessageBloc _messageBloc;
  late final ApiService _apiService;

  @override
  void initState() {
    super.initState();
    _apiService = ApiService(baseUrl: dotenv.env['API_URL'] ?? 'http://localhost:3000');
    _messageBloc = MessageBloc(apiService: _apiService);
  }

  @override
  void dispose() {
    _messageBloc.close();
    super.dispose();
  }



  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => _messageBloc,
      child: BlocListener<MessageBloc, MessageState>(
        bloc: _messageBloc,
        listener: (context, state) {
          if (state is MessageSending) {
            setState(() => _isTyping = true);
          } else if (state is MessageSent) {
            setState(() {
              _messages.insert(0, state.message);
              _isTyping = state.message.sender == "user";
            });
          } else if (state is MessageError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.error)),
            );
            setState(() => _isTyping = false);
          }
        },
        child: Scaffold(
          appBar: AppBar(title: const Text("ChatGPT")),
          body: SafeArea(
            child: Column(
              children: [
                Flexible(
                  child: ListView.builder(
                    reverse: true,
                    padding: const EdgeInsets.all(8.0),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      return _messages[index];
                    },
                  ),
                ),
                if (_isTyping) const ThreeDots(),
                const Divider(height: 1.0),
                Container(
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                  ),
                  child: _buildTextComposer(),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextComposer() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          Container(
            height: 50,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _availableModels.length,
              itemBuilder: (context, index) {
                final model = _availableModels[index];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: ChoiceChip(
                    label: Text(model),
                    selected: _selectedModel == model,
                    onSelected: (selected) {
                      if (selected) {
                        setState(() {
                          _selectedModel = model;
                        });
                      }
                    },
                  ),
                );
              },
            ),
          ),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  onSubmitted: (value) {
                    if (value.isNotEmpty) {
                      _messageBloc.add(SendMessageEvent(
                        message: value,
                        model: _selectedModel,
                      ));
                      _controller.clear();
                    }
                  },
                  decoration: const InputDecoration.collapsed(
                    hintText: "Question/description",
                  ),
                ),
              ),
              OverflowBar(
                children: [
                  IconButton(
                    icon: const Icon(Icons.send),
                    onPressed: () {
                      if (_controller.text.isNotEmpty) {
                        _messageBloc.add(SendMessageEvent(
                          message: _controller.text,
                          model: _selectedModel,
                        ));
                        _controller.clear();
                      }
                    },
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
