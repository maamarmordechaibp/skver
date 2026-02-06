/**
 * laml-builder-with-recordings.ts
 * Enhanced LaML response builder that can use either TTS or MP3 recordings
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.35.0';

export class RecordingLaMLBuilder {
  private supabaseUrl: string;
  private supabaseServiceRoleKey: string;
  private recordingCache: Map<string, string | null> = new Map();

  constructor(supabaseUrl: string, supabaseServiceRoleKey: string) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseServiceRoleKey = supabaseServiceRoleKey;
  }

  /**
   * Get recording URL by category, or return null to use TTS fallback
   */
  async getRecordingUrl(category: string): Promise<string | null> {
    // Check cache first
    if (this.recordingCache.has(category)) {
      return this.recordingCache.get(category) || null;
    }

    try {
      const supabase = createClient(
        this.supabaseUrl,
        this.supabaseServiceRoleKey
      );

      const { data, error } = await supabase
        .from('recordings')
        .select('mp3_url')
        .eq('category', category)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        this.recordingCache.set(category, null);
        return null;
      }

      this.recordingCache.set(category, data.mp3_url);
      return data.mp3_url;
    } catch (error) {
      console.error(`Error fetching recording for ${category}:`, error);
      this.recordingCache.set(category, null);
      return null;
    }
  }

  /**
   * Play a message - either recording or TTS fallback
   */
  async playMessage(
    category: string,
    ttsFallback: string,
    voice: string = 'man',
    language: string = 'en-US'
  ): Promise<string> {
    const recordingUrl = await this.getRecordingUrl(category);

    if (recordingUrl) {
      return `<Play>${recordingUrl}</Play>`;
    }

    // Fallback to TTS
    return `<Say voice="${voice}" language="${language}">${ttsFallback}</Say>`;
  }

  /**
   * Create complete LaML response with optional gather
   */
  async createResponse(
    messages: Array<{
      category: string;
      tts: string;
      voice?: string;
      language?: string;
    }>,
    gather?: {
      action: string;
      numDigits?: number;
      finishOnKey?: string;
      timeout?: number;
    }
  ): Promise<string> {
    const messageElements = await Promise.all(
      messages.map(async (msg) =>
        this.playMessage(
          msg.category,
          msg.tts,
          msg.voice || 'man',
          msg.language || 'en-US'
        )
      )
    );

    let laml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>';

    if (gather) {
      laml += `\n  <Gather action="${gather.action}" numDigits="${
        gather.numDigits || 1
      }" finishOnKey="${gather.finishOnKey || '#'}" timeout="${
        gather.timeout || 10
      }">`;
      messageElements.forEach((element) => {
        laml += `\n    ${element}`;
      });
      laml += '\n  </Gather>';
    } else {
      messageElements.forEach((element) => {
        laml += `\n  ${element}`;
      });
    }

    laml += '\n</Response>';
    return laml;
  }

  /**
   * Simple welcome message with recording or TTS
   */
  async welcomeMessage(): Promise<string> {
    return this.createResponse([
      {
        category: 'greeting',
        tts: 'Welcome to our phone system',
      },
    ]);
  }

  /**
   * Registration menu with optional recording
   */
  async registrationMenu(baseUrl: string, from: string): Promise<string> {
    return this.createResponse(
      [
        {
          category: 'registration',
          tts: 'You are not yet registered. Press 1 to register, or press 2 to return to the main menu.',
        },
      ],
      {
        action: `${baseUrl}/voice-registration-option?from=${encodeURIComponent(from)}`,
        numDigits: 1,
        timeout: 15,
      }
    );
  }

  /**
   * Error message with optional recording
   */
  async errorMessage(): Promise<string> {
    return this.createResponse([
      {
        category: 'error',
        tts: 'Sorry, I did not understand. Please try again.',
      },
    ]);
  }

  /**
   * Confirmation prompt with recording or TTS
   */
  async confirmMessage(details: string): Promise<string> {
    return this.createResponse([
      {
        category: 'confirmation',
        tts: `Please confirm: ${details}. Press 1 to confirm or 2 to change.`,
      },
    ]);
  }

  /**
   * Thank you message with recording or TTS
   */
  async thankYouMessage(): Promise<string> {
    return this.createResponse([
      {
        category: 'thank_you',
        tts: 'Thank you for your response. Goodbye.',
      },
    ]);
  }
}

// Export legacy LaMLResponses for backwards compatibility
export class LaMLResponses {
  static welcome() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">Welcome to our phone system.</Say>
</Response>`;
  }

  static error() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">Sorry, an error occurred. Please try again later.</Say>
</Response>`;
  }

  static goodbye() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">Thank you. Goodbye.</Say>
</Response>`;
  }

  static invalid() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">I did not understand that input. Please try again.</Say>
</Response>`;
  }
}
