/**
 * LaML (Language Markup) XML Response Builder
 * SignalWire Language Markup for IVR voice flows
 */

interface LaMLOptions {
  voice?: 'man' | 'woman';
  language?: string;
  timeout?: number;
  numDigits?: number;
  finishOnKey?: string;
  maxLength?: number;
  playBeep?: boolean;
}

export class LaMLBuilder {
  private xml: string[] = [];
  
  constructor() {
    this.xml.push('<?xml version="1.0" encoding="UTF-8"?>');
    this.xml.push('<Response>');
  }
  
  say(text: string, options: LaMLOptions = {}): this {
    const voice = options.voice || 'man';
    const language = options.language || 'en-US';
    
    this.xml.push(
      `  <Say voice="${voice}" language="${language}">${this.escapeXml(text)}</Say>`
    );
    return this;
  }
  
  gather(
    action: string,
    callback: (builder: LaMLBuilder) => void,
    options: LaMLOptions = {}
  ): this {
    const numDigits = options.numDigits || 1;
    const timeout = options.timeout || 10;
    const finishOnKey = options.finishOnKey || '#';
    
    this.xml.push(
      `  <Gather action="${action}" numDigits="${numDigits}" timeout="${timeout}" finishOnKey="${finishOnKey}">`
    );
    
    const inner = new LaMLBuilder();
    inner.xml = []; // Reset so we don't get the XML declaration
    callback(inner);
    
    // Add inner content
    inner.xml.forEach(line => {
      if (!line.includes('<?xml') && !line.includes('<Response>') && !line.includes('</Response>')) {
        this.xml.push(line);
      }
    });
    
    this.xml.push('  </Gather>');
    return this;
  }
  
  pause(length: number = 1): this {
    this.xml.push(`  <Pause length="${length}"/>`);
    return this;
  }
  
  play(url: string): this {
    this.xml.push(`  <Play>${url}</Play>`);
    return this;
  }
  
  dial(phoneNumber: string, options: LaMLOptions = {}): this {
    const timeout = options.timeout || 30;
    this.xml.push(
      `  <Dial timeout="${timeout}">${phoneNumber}</Dial>`
    );
    return this;
  }
  
  redirect(url: string): this {
    this.xml.push(`  <Redirect>${url}</Redirect>`);
    return this;
  }
  
  record(
    action: string,
    options: LaMLOptions = {}
  ): this {
    const maxLength = options.maxLength || 120;
    const playBeep = options.playBeep !== false ? 'true' : 'false';
    const finishOnKey = options.finishOnKey || '#';
    
    this.xml.push(
      `  <Record action="${action}" maxLength="${maxLength}" playBeep="${playBeep}" finishOnKey="${finishOnKey}"/>`
    );
    return this;
  }
  
  hangup(): this {
    this.xml.push('  <Hangup/>');
    return this;
  }
  
  build(): string {
    this.xml.push('</Response>');
    return this.xml.join('\n');
  }
  
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// Convenience function
export function laml(callback: (builder: LaMLBuilder) => void): string {
  const builder = new LaMLBuilder();
  callback(builder);
  return builder.build();
}

// Pre-built responses
export const LaMLResponses = {
  // Main menu greeting
  mainMenu: (appUrl: string): string => {
    return laml(b =>
      b.gather('/api/voice/main-menu', (inner) => {
        inner.say(
          'Welcome to the Guest House phone system. ' +
          'Press 1 to report your availability. ' +
          'Press 2 to register as a host. ' +
          'Press 3 to connect to the office. ' +
          'Press 8 for admin options. ' +
          'Press 0 to leave a message.',
          { language: 'en-US', timeout: 10 }
        );
      })
        .say('We did not receive a response. Goodbye.', {})
    );
  },
  
  // Host is registered - ask for confirmation
  registeredHostMenu: (hostName: string, totalBeds: number, appUrl: string): string => {
    return laml(b =>
      b.say(
        `We recognize you as ${hostName}. You have ${totalBeds} beds available.`,
        { language: 'en-US' }
      )
        .gather('/api/voice/confirm-or-change', (inner) => {
          inner.say('Press 1 to confirm. Press 2 to change the number.', { language: 'en-US' });
        })
    );
  },
  
  // New/unregistered host - ask for beds
  unregisteredHostMenu: (): string => {
    return laml(b =>
      b.say(
        'We recognize your number but you are not yet registered. ' +
        'Please enter the number of beds available, then press pound.',
        { language: 'en-US' }
      )
        .gather('/api/voice/save-new-beds', (inner) => {
          // Gather with finish on key #
        }, { finishOnKey: '#', timeout: 15 })
    );
  },
  
  // Registration flow - ask for beds
  registrationBeds: (): string => {
    return laml(b =>
      b.say(
        'Please enter the number of beds available for guests, then press pound.',
        { language: 'en-US' }
      )
        .gather('/api/voice/reg-location', (inner) => {
          // Gather with finish on key #
        }, { finishOnKey: '#', timeout: 15 })
    );
  },
  
  // Registration - ask for location type
  registrationLocation: (): string => {
    return laml(b =>
      b.gather('/api/voice/reg-frequency', (inner) => {
        inner.say(
          'Is your accommodation a private vacation rental? Press 1. ' +
          'Or is it at your home? Press 2.',
          { language: 'en-US' }
        );
      })
    );
  },
  
  // Registration - ask for call frequency
  registrationFrequency: (): string => {
    return laml(b =>
      b.gather('/api/voice/reg-complete', (inner) => {
        inner.say(
          'How often would you like to receive calls? ' +
          'Press 1 for weekly. Press 2 for special Shabatot only.',
          { language: 'en-US' }
        );
      })
    );
  },
  
  // Registration complete
  registrationComplete: (): string => {
    return laml(b =>
      b.say(
        'Thank you for registering! When you confirm your availability ' +
        'and we arrange guests for you, we may call to confirm at your convenience. Goodbye!',
        { language: 'en-US' }
      )
    );
  },
  
  // Admin PIN entry
  adminPin: (): string => {
    return laml(b =>
      b.say('Admin options. Please enter your access code and press pound.', { language: 'en-US' })
        .gather('/api/voice/admin-verify-pin', (inner) => {
          // Gather with finish on key #
        }, { finishOnKey: '#', timeout: 15 })
    );
  },
  
  // Admin - ask for beds needed
  adminBedsNeeded: (): string => {
    return laml(b =>
      b.say('How many beds do we need for this Shabbat? Enter the number and press pound.', { language: 'en-US' })
        .gather('/api/voice/admin-save-beds', (inner) => {
          // Gather with finish on key #
        }, { finishOnKey: '#', timeout: 15 })
    );
  },
  
  // Admin - record message
  adminRecordMessage: (): string => {
    return laml(b =>
      b.say('Please record your weekly message after the beep. Press pound when done.', { language: 'en-US' })
        .record('/api/voice/admin-message-recorded', { maxLength: 60, playBeep: true, finishOnKey: '#' })
    );
  },
  
  // Admin - review message
  adminReviewMessage: (recordingUrl: string): string => {
    return laml(b =>
      b.say('Your message:', { language: 'en-US' })
        .play(recordingUrl)
        .gather('/api/voice/admin-message-action', (inner) => {
          inner.say(
            'Press 1 to hear again. Press 2 to record again. Press 3 to confirm.',
            { language: 'en-US' }
          );
        })
    );
  },
  
  // Admin - confirm campaign
  adminConfirmCampaign: (bedsNeeded: number): string => {
    return laml(b =>
      b.gather('/api/voice/admin-launch-campaign', (inner) => {
        inner.say(
          `You requested ${bedsNeeded} beds. Press 1 to confirm and start calling. Press 2 to change the number.`,
          { language: 'en-US' }
        );
      })
    );
  },
  
  // Admin - campaign launched
  adminCampaignLaunched: (): string => {
    return laml(b =>
      b.say(
        'Thank you! The system will now call hosts. You will receive a report by email. Goodbye!',
        { language: 'en-US' }
      )
    );
  },
  
  // Outbound call - ask for availability
  outboundCall: (hostName: string, totalBeds: number, messageUrl?: string): string => {
    return laml(b => {
      if (messageUrl) {
        b.play(messageUrl).pause(1);
      }
      
      return b.gather('/api/voice/outbound-response', (inner) => {
        inner.say(
          `We recognize you as ${hostName}. You have ${totalBeds} beds available. ` +
          'Press 1 to confirm you can host guests. Press 2 to change the number. Press 3 to decline.',
          { language: 'en-US', timeout: 10 }
        );
      })
        .say('We did not receive a response. We will try again later. Goodbye.', {});
    });
  },
  
  // Voicemail
  voicemail: (): string => {
    return laml(b =>
      b.say(
        'Please leave a clear message with your name and phone number. We will contact you. Thank you.',
        { language: 'en-US' }
      )
        .record('/api/voice/voicemail-complete', { maxLength: 120, playBeep: true })
    );
  },
  
  // Response - accepted
  acceptedResponse: (): string => {
    return laml(b =>
      b.say(
        'Thank you! We will call you personally to arrange guests based on your preference. Goodbye!',
        { language: 'en-US' }
      )
    );
  },
  
  // Response - declined
  declinedResponse: (): string => {
    return laml(b =>
      b.say('Thank you for your response. Goodbye!', { language: 'en-US' })
    );
  },
  
  // Error response
  error: (): string => {
    return laml(b =>
      b.say('Invalid option. Please try again. Goodbye.', { language: 'en-US' })
    );
  }
};
