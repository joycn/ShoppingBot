import 'dart:convert';
import 'package:http/http.dart' as http;
import 'dart:async';

class ApiService {
  final String baseUrl;
  final http.Client _client;

  ApiService({required this.baseUrl}) : _client = http.Client();

  Stream<String> connectToSSE({
    required String message,
    required String model,
  }) async* {
    try {
      final request = http.Request('POST', Uri.parse('$baseUrl/api/chat'));
      request.headers['Content-Type'] = 'application/json';
      request.headers['Accept'] = 'text/event-stream';
      request.body = jsonEncode({
        'message': message,
        'model': model,
      });

      final response = await _client.send(request);

      if (response.statusCode != 200) {
        final errorBody = await response.stream.transform(utf8.decoder).join();
        throw Exception('Failed to connect to SSE: ${response.statusCode}\nError: $errorBody');
      }

      await for (final chunk in response.stream.transform(utf8.decoder)) {
        if (chunk.trim().isEmpty) continue;
        
        if (chunk.startsWith('data: ')) {
          final data = chunk.substring(6).trim();
          if (data == '[DONE]') {
            break;
          }
          
          try {
            final jsonData = jsonDecode(data);
            final content = jsonData['content'] as String?; // Server sends content, not response
            if (content != null && content.isNotEmpty) {
              yield content;
            }
          } catch (e) {
            print('Error parsing SSE data: $e\nData: $data');
          }
        }
      }
    } catch (e) {
      throw Exception('Error in SSE connection: $e');
    } finally {
      _client.close();
    }
  }

  Future<String> sendMessage({
    required String message,
    required String model,
  }) async {
    try {
      final response = await _client.post(
        Uri.parse('$baseUrl/chat'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'message': message,
          'model': model,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['content'] ?? '';
      } else {
        throw Exception('Failed to get response: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error communicating with server: $e');
    }
  }

  void dispose() {
    _client.close();
  }
}
