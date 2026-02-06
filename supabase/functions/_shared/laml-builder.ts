/**
 * LaML (Language Markup) Builder for SignalWire Voice Responses
 * Builds XML responses for voice calls
 */

export interface LaMLBuilderOptions {
  voice?: 'man' | 'woman';
  language?: string;
  timeout?: number;
}

export class LaMLBuilder {
  private elements: string[] = [];
  
  constructor(private options: LaMLBuilderOptions = {}) {
    this.options.voice = this.options.voice || 'man';
    this.options.language = this.options.language || 'en-US';
    this.options.timeout = this.options.timeout || 10;
  }

  static say(
    text: string,
    voice: string = 'man',
    language: string = 'en-US'
  ): string {
    return `<Say voice="${voice}" language="${language}">${this.escapeXml(text)}</Say>`;
  }

  static gather(
    action: string,
    numDigits: number = 1,
    finishOnKey: string = '',
    timeout: number = 10,
    content: string = ''
  ): string {
    let gather = `<Gather action="${action}" numDigits="${numDigits}" timeout="${timeout}"`;
    if (finishOnKey) {
      gather += ` finishOnKey="${finishOnKey}"`;
    }
    gather += `>${content}</Gather>`;
    return gather;
  }

  static redirect(url: string): string {
    return `<Redirect>${url}</Redirect>`;
  }

  static record(
    action: string,
    maxLength: number = 60,
    finishOnKey: string = '#'
  ): string {
    return `<Record action="${action}" maxLength="${maxLength}" finishOnKey="${finishOnKey}" playBeep="true" />`;
  }

  static play(url: string): string {
    return `<Play>${url}</Play>`;
  }

  static dial(number: string, timeout: number = 30): string {
    return `<Dial timeout="${timeout}">${number}</Dial>`;
  }

  static pause(length: number = 1): string {
    return `<Pause length="${length}"/>`;
  }

  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  static response(content: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?><Response>${content}</Response>`;
  }
}

export const LaMLResponses = {
  // Main menu - generic welcome, NO name (name only when pressing 1)
  mainMenu: (appUrl: string, customRecordingUrl?: string, customTtsText?: string): string => {
    let content = '';
    
    // Play custom main menu recording if available
    if (customRecordingUrl) {
      content += LaMLBuilder.play(customRecordingUrl);
    } else if (customTtsText) {
      // Use custom TTS text from database
      content += LaMLBuilder.say(customTtsText, 'man', 'en-US');
    } else {
      content += LaMLBuilder.say(
        'Welcome to the Guest House Management Phone Line. To report availability, press 1. To register as a host, press 2. To contact the office, press 3. For admin options, press 8. To leave a message, press 0.',
        'man',
        'en-US'
      );
    }
    
    content += LaMLBuilder.gather(
      `${appUrl}/functions/v1/voice-main-menu`,
      1,
      '',
      10,
      ''
    );
    content += LaMLBuilder.say(
      'We did not receive an answer. Have a good Shabbat.',
      'man',
      'en-US'
    );
    return LaMLBuilder.response(content);
  },

  registrationBeds: (): string => {
    const content = LaMLBuilder.gather(
      '/functions/v1/voice-reg-location',
      undefined,
      '#',
      15,
      LaMLBuilder.say(
        'Welcome to the registration flow. Please enter the number of beds available and press pound.',
        'man',
        'en-US'
      )
    );
    return LaMLBuilder.response(content);
  },

  registrationLocation: (): string => {
    const content = LaMLBuilder.gather(
      '/functions/v1/voice-reg-frequency',
      1,
      '',
      10,
      LaMLBuilder.say(
        'Thank you. Is this a private accommodation or your home? Press 1 for private, press 2 for home.',
        'man',
        'en-US'
      )
    );
    return LaMLBuilder.response(content);
  },

  registrationFrequency: (): string => {
    const content = LaMLBuilder.gather(
      '/functions/v1/voice-reg-complete',
      1,
      '',
      10,
      LaMLBuilder.say(
        'How often would you like to receive calls? Press 1 for weekly, press 2 for special Shabbats only.',
        'man',
        'en-US'
      )
    );
    return LaMLBuilder.response(content);
  },

  registrationComplete: (): string => {
    const content = LaMLBuilder.say(
      'Thank you for registering! You will now receive calls about available guests. Goodbye.',
      'man',
      'en-US'
    );
    return LaMLBuilder.response(content);
  },

  adminBedsNeeded: (): string => {
    const content = LaMLBuilder.gather(
      '/functions/v1/voice-admin-save-beds',
      undefined,
      '#',
      15,
      LaMLBuilder.say(
        'Admin menu. How many beds do we need this Shabbat? Enter the number and press pound.',
        'man',
        'en-US'
      )
    );
    return LaMLBuilder.response(content);
  },

  adminRecordMessage: (): string => {
    const content =
      LaMLBuilder.say(
        'Please record the custom message for hosts after the beep. Press pound when done.',
        'man',
        'en-US'
      ) +
      LaMLBuilder.record('/functions/v1/voice-admin-message-recorded', 60, '#');
    return LaMLBuilder.response(content);
  },

  // Outbound call - play campaign recording + 3 options
  outboundCall: (
    hostName: string,
    totalBeds: number,
    messageUrl?: string,
    appUrl?: string
  ): string => {
    let content = '';
    const baseUrl = appUrl || '';
    
    // Play weekly campaign recording first
    if (messageUrl) {
      content += LaMLBuilder.play(messageUrl);
      content += LaMLBuilder.pause(1);
    }
    
    // Then say beds and options
    content += LaMLBuilder.gather(
      `${baseUrl}/functions/v1/voice-outbound-response`,
      1,
      '',
      10,
      LaMLBuilder.say(
        `We have in the system that you have ${totalBeds} beds available. To confirm your beds are available for this week, press 1. To change the amount of beds, press 2. To get a callback on Friday if still needed, press 3.`,
        'man',
        'en-US'
      )
    );
    content += LaMLBuilder.say(
      'We did not receive a response. Goodbye.',
      'man',
      'en-US'
    );
    return LaMLBuilder.response(content);
  },

  acceptedResponse: (): string => {
    const content = LaMLBuilder.say(
      'Thank you for confirming. We will contact you shortly to arrange guests. Goodbye.',
      'man',
      'en-US'
    );
    return LaMLBuilder.response(content);
  },

  declinedResponse: (): string => {
    const content = LaMLBuilder.say(
      'Thank you for your response. Goodbye.',
      'man',
      'en-US'
    );
    return LaMLBuilder.response(content);
  },

  voicemail: (): string => {
    const content =
      LaMLBuilder.say(
        'Please leave a message with your name and phone number after the beep. Press pound when done.',
        'man',
        'en-US'
      ) +
      LaMLBuilder.record('/functions/v1/voice-voicemail-complete', 120, '#');
    return LaMLBuilder.response(content);
  },

  error: (): string => {
    const content = LaMLBuilder.say(
      'We encountered an error. Goodbye.',
      'man',
      'en-US'
    );
    return LaMLBuilder.response(content);
  },
};
