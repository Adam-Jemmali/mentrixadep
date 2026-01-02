# Video Calling Setup Guide

## Overview

OTAMS now includes secure, in-app video calling using WebRTC. Video calls work directly inside the application without external services like Zoom or Google Meet.

## Features

- ✅ Peer-to-peer WebRTC video calls
- ✅ Secure signaling via Supabase Realtime
- ✅ Time-window enforcement (5 min before to 15 min after session)
- ✅ Server-authoritative access control
- ✅ Camera and microphone controls
- ✅ Auto-disconnect when session expires
- ✅ Mobile-friendly interface

## Database Setup

1. Run the SQL schema in Supabase SQL Editor:

```bash
# Run this file in Supabase SQL Editor
supabase-video-calling-schema.sql
```

This creates:

- `video_rooms` table - Stores video room information
- `call_participants` table - Tracks who joined calls
- RLS policies for secure access
- Helper functions for token generation and cleanup

## Environment Variables

Add these optional environment variables to `.env.local`:

```env
# Optional: Custom STUN servers (comma-separated)
NEXT_PUBLIC_STUN_SERVERS=stun:stun.example.com:3478,stun:stun2.example.com:3478

# Optional: TURN servers for NAT traversal (comma-separated)
# Format: server|username|credential
NEXT_PUBLIC_TURN_SERVERS=turn:turn.example.com:3478|username|password
```

**Note**: If not provided, the app uses Google's public STUN servers by default.

## How It Works

### 1. Session Time Window

Video calls are only available during:

- **Start**: 5 minutes before session start time
- **End**: 15 minutes after session end time

### 2. Room Creation

- Video rooms are created automatically when a user clicks "Join Video Call"
- Each session has exactly one video room
- Rooms expire 15 minutes after session end

### 3. Access Control

- Only the assigned student and tutor can join
- Server-side validation ensures:
  - User is authenticated
  - User is part of the session
  - Current time is within the allowed window
  - Room is still active

### 4. WebRTC Signaling

- Uses Supabase Realtime for signaling (offers, answers, ICE candidates)
- Channel name: `video-room-{roomId}`
- Student initiates the call (creates offer)
- Tutor responds (creates answer)

### 5. Security

- Room tokens are cryptographically secure (32-byte random)
- RLS policies enforce access at database level
- Server actions validate all requests
- No unauthorized users can join

## Usage

### For Students

1. Go to "My Sessions" on the student dashboard
2. Find an upcoming session
3. Click "📹 Join Video Call" (available 5 min before session)
4. Allow camera/microphone permissions
5. Wait for tutor to join
6. Use controls to mute/unmute, turn camera on/off
7. Click "End Call" when done

### For Tutors

1. Go to "My Sessions" on the tutor dashboard
2. Find an upcoming session
3. Click "📹 Join Video Call" (available 5 min before session)
4. Allow camera/microphone permissions
5. Wait for student to initiate call
6. Use controls to mute/unmute, turn camera on/off
7. Click "End Call" when done

## Troubleshooting

### "Video room not found"

- Ensure the session exists
- Check that you're within the time window
- Try refreshing the page

### "Session time window expired"

- Video calls close 15 minutes after session end
- You cannot join outside the allowed window

### "Camera/microphone permission denied"

- Check browser permissions
- Ensure no other app is using the camera/mic
- Try refreshing and allowing permissions again

### "Connection failed"

- Check your internet connection
- Ensure STUN/TURN servers are accessible
- Try refreshing the page

### "Other participant disconnected"

- The other person may have left the call
- Check your connection
- Try rejoining the call

## Technical Details

### WebRTC Configuration

- **ICE Candidate Pool Size**: 10
- **Video Resolution**: 1280x720 (720p)
- **Codecs**: Browser default (usually VP8/VP9 for video, Opus for audio)

### Signaling Flow

1. Student joins → Creates room → Subscribes to channel
2. Student creates offer → Sends via Supabase Realtime
3. Tutor receives offer → Creates answer → Sends via Realtime
4. Student receives answer → Sets remote description
5. ICE candidates exchanged → Connection established
6. Media streams flow peer-to-peer

### Database Schema

```sql
video_rooms:
  - id (UUID)
  - session_id (UUID, unique)
  - room_token (TEXT, unique, secure random)
  - active (BOOLEAN)
  - created_at (TIMESTAMPTZ)
  - expires_at (TIMESTAMPTZ)

call_participants:
  - id (UUID)
  - room_id (UUID)
  - user_id (UUID)
  - role (student|tutor)
  - joined_at (TIMESTAMPTZ)
  - left_at (TIMESTAMPTZ, nullable)
```

## Future Enhancements

- Screen sharing
- Chat during calls
- Recording (with consent)
- Group sessions
- SFU (Selective Forwarding Unit) for better scalability

## Security Considerations

1. **Token Rotation**: Each session gets a unique room token
2. **Time Windows**: Strict enforcement prevents unauthorized access
3. **RLS Policies**: Database-level security
4. **Server Validation**: All actions validated server-side
5. **No Replay Attacks**: Tokens expire and cannot be reused

## Support

For issues or questions, check:

- Browser console for errors
- Network tab for WebRTC connection issues
- Supabase logs for database errors
