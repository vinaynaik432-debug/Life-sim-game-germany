const el = (tag, className = '', text) => {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
};

const humanise = (value) => String(value ?? '')
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .replace(/^./, (letter) => letter.toUpperCase());

/** Reusable, dependency-free story overlays. All supplied prose is rendered as text. */
export class StoryUI {
  constructor(rootElement) {
    this.root = rootElement;
    this.open = false;
    this.serial = 0;
    this.pending = null;
    this.abort = null;
    this.previousFocus = null;
    this.animationFrame = null;
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.root.classList.add('story-root');
  }

  isOpen() { return this.open; }

  hide() {
    const resolve = this.pending;
    this.pending = null;
    this.open = false;
    this.serial += 1;
    this.abort?.abort();
    this.abort = null;
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.root.replaceChildren();
    this.root.removeAttribute('data-open');
    if (this.previousFocus?.isConnected) this.previousFocus.focus({ preventScroll: true });
    this.previousFocus = null;
    // Replacing or explicitly closing an unfinished overlay must not strand an await.
    resolve?.(undefined);
  }

  _mount(kind, label) {
    this.hide();
    this.open = true;
    this.root.dataset.open = 'true';
    this.previousFocus = document.activeElement;
    this.abort = new AbortController();
    const shell = el('div', `story-overlay story-overlay--${kind}`);
    const panel = el('section', `story-panel story-panel--${kind}`);
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', label);
    panel.tabIndex = -1;
    shell.append(panel);
    this.root.append(shell);

    window.addEventListener('keydown', (event) => {
      if (!this.open) return;
      if (event.key === 'Tab') {
        const focusable = [...panel.querySelectorAll('button:not(:disabled), input, [tabindex="0"]')];
        if (!focusable.length) {
          event.preventDefault();
          panel.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
      if (event.key === 'Enter' || event.key === ' ') {
        // One explicit click per keydown; prevent native activation from doing it twice.
        if (event.repeat) { event.preventDefault(); return; }
        const focusedButton = document.activeElement?.closest?.('button');
        const buttons = [...panel.querySelectorAll('button:not(:disabled)')];
        const target = focusedButton && panel.contains(focusedButton) ? focusedButton
          : buttons.length === 1 ? buttons[0] : null;
        event.preventDefault();
        event.stopImmediatePropagation();
        target?.click();
      }
    }, { signal: this.abort.signal, capture: true });

    const serial = this.serial;
    requestAnimationFrame(() => {
      if (this.open && serial === this.serial) panel.focus({ preventScroll: true });
    });
    return panel;
  }

  _promise() {
    return new Promise((resolve) => { this.pending = resolve; });
  }

  _finish(value) {
    const resolve = this.pending;
    this.pending = null;
    this.hide();
    resolve?.(value);
  }

  _button(label, callback, secondary = false) {
    const button = el('button', `story-button${secondary ? ' story-button--secondary' : ''}`, label);
    button.type = 'button';
    button.addEventListener('click', callback, { signal: this.abort.signal });
    return button;
  }

  dialogue({ speaker = '', text = '', choices = [], continueLabel = 'Continue' } = {}) {
    const panel = this._mount('dialogue', speaker || 'Story');
    if (speaker) panel.append(el('div', 'story-eyebrow', speaker));
    const prose = el('p', 'story-prose', text);
    panel.append(prose);
    const actions = el('div', 'story-actions');
    if (choices.length) {
      actions.classList.add('story-actions--choices');
      for (const choice of choices) {
        const button = this._button(choice.label, () => this._finish(choice.value), true);
        if (choice.detail) button.append(el('small', 'story-choice-detail', choice.detail));
        actions.append(button);
      }
    } else {
      actions.append(this._button(continueLabel, () => this._finish(true)));
      actions.append(el('span', 'story-key-hint', 'Enter ↵'));
    }
    panel.append(actions);
    return this._promise();
  }

  chapterCard({ eyebrow = '', title = '', text = '', button = 'Continue' } = {}) {
    const panel = this._mount('chapter', title || 'Chapter');
    panel.append(el('span', 'story-chapter-rule'));
    if (eyebrow) panel.append(el('p', 'story-eyebrow', eyebrow));
    panel.append(el('h1', 'story-title', title));
    if (text) panel.append(el('p', 'story-chapter-copy', text));
    panel.append(this._button(button, () => this._finish(true)));
    return this._promise();
  }

  phone({ contact = 'Home', messages = [], draft = '', choices = [] } = {}) {
    const panel = this._mount('phone', `Messages with ${contact}`);
    const screen = el('div', 'story-phone-screen');
    const statusBar = el('div', 'story-phone-statusbar');
    statusBar.setAttribute('aria-hidden', 'true');
    const clock = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const connection = el('span', 'story-phone-connection');
    connection.append(el('span', 'story-phone-signal'), el('span', 'story-phone-network', 'LTE'), el('span', 'story-phone-battery'));
    statusBar.append(el('span', 'story-phone-clock', clock), el('span', 'story-phone-speaker'), connection);
    const header = el('header', 'story-phone-header');
    const avatar = el('span', 'story-contact-avatar', Array.from(contact)[0] || 'H');
    avatar.setAttribute('aria-hidden', 'true');
    const name = el('div', 'story-phone-name');
    name.append(el('strong', '', contact), el('span', '', 'Messages'));
    header.append(avatar, name, el('span', 'story-phone-dot'));
    const log = el('div', 'story-messages');
    log.setAttribute('role', 'log');
    log.setAttribute('aria-live', 'polite');
    const addMessage = ({ speaker, text }) => {
      const bubble = el('p', `story-bubble story-bubble--${speaker === 'player' ? 'player' : 'home'}`, text);
      log.append(bubble);
      log.scrollTop = log.scrollHeight;
    };
    for (const message of messages) addMessage(message);
    const composer = el('div', 'story-composer');
    composer.append(el('span', 'story-composer-label', 'Your message'));
    const messageText = el('p', 'story-draft', draft);
    composer.append(messageText);
    const status = el('p', 'story-phone-status', choices.length ? 'Choose what you want to share.' : '');
    status.setAttribute('aria-live', 'polite');
    const actions = el('div', 'story-phone-actions');
    const content = el('div', 'story-phone-content');
    const reply = el('div', 'story-phone-reply');
    reply.append(composer, status, actions);
    content.append(log, reply);
    const homeBar = el('div', 'story-phone-homebar');
    homeBar.setAttribute('aria-hidden', 'true');
    screen.append(statusBar, header, content, homeBar);
    panel.append(screen);
    const serial = this.serial;
    let choosing = false;

    const choose = async (choice) => {
      if (choosing) return;
      choosing = true;
      actions.querySelectorAll('button').forEach((button) => { button.disabled = true; });
      const outgoing = String(choice.text ?? draft);
      status.textContent = outgoing === draft ? 'Sending…' : 'Finding the words…';
      const completed = await this._rewrite(messageText, String(draft), outgoing, serial);
      if (!completed || !this.open || serial !== this.serial) return;
      addMessage({ speaker: 'player', text: outgoing });
      composer.hidden = true;
      status.textContent = 'Sent';
      actions.replaceChildren(this._button('Continue', () => this._finish(choice.value)));
      actions.querySelector('button').focus({ preventScroll: true });
    };

    if (choices.length) {
      for (const choice of choices) {
        actions.append(this._button(choice.label, () => choose(choice), true));
      }
    } else {
      composer.hidden = !draft;
      actions.append(this._button(draft ? 'Send message' : 'Continue', () => {
        if (draft) choose({ value: true, text: draft });
        else this._finish(true);
      }));
    }
    requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
    return this._promise();
  }

  _rewrite(node, original, replacement, serial) {
    if (this.reducedMotion || original === replacement) {
      node.textContent = replacement;
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      const start = performance.now();
      const duration = 720;
      const originalChars = Array.from(original);
      const replacementChars = Array.from(replacement);
      const step = (time) => {
        if (!this.open || serial !== this.serial) { resolve(false); return; }
        const progress = Math.min(1, (time - start) / duration);
        node.textContent = progress < 0.4
          ? originalChars.slice(0, Math.ceil(originalChars.length * (1 - progress / 0.4))).join('')
          : replacementChars.slice(0, Math.ceil(replacementChars.length * ((progress - 0.4) / 0.6))).join('');
        if (progress < 1) this.animationFrame = requestAnimationFrame(step);
        else { this.animationFrame = null; resolve(true); }
      };
      this.animationFrame = requestAnimationFrame(step);
    });
  }

  endCard({ name = 'Ari', choices = {}, onReplay, onEdit } = {}) {
    const panel = this._mount('end', 'Chapter one complete');
    panel.append(el('span', 'story-chapter-rule'));
    panel.append(el('p', 'story-eyebrow', 'Chapter 01 · Complete'));
    panel.append(el('h1', 'story-title', 'The first night.'));
    panel.append(el('p', 'story-chapter-copy', `${name}, you made it here. Tomorrow, a little more of the city will become familiar.`));

    const list = el('dl', 'story-recap');
    const labels = {
      photo: 'The photograph', photoPlacement: 'The photograph', photograph: 'The photograph',
      message: 'Your message home', messageChoice: 'Your message home', phoneChoice: 'Your message home',
      photoFraming: 'Your first picture', photographFraming: 'Your first picture',
      blanket: 'The blanket', spice: 'A taste of home', name: 'Your name',
    };
    const values = {
      honest: 'You shared how you felt.', reassure: 'You reassured your family.',
      reassuring: 'You reassured your family.', desk: 'Placed on the desk.',
      bedside: 'Kept beside the bed.', bed: 'Kept beside the bed.', packed: 'Kept safely in the suitcase.',
      whole: 'The whole room, just as it was.', tidy: 'A quiet corner by the window.',
      full: 'The whole room, just as it was.', window: 'A quiet corner by the window.',
    };
    const entries = Array.isArray(choices)
      ? choices.map((choice) => [choice.label ?? '', choice.text ?? choice.value ?? ''])
      : Object.entries(choices ?? {}).filter(([, value]) => value !== null && value !== undefined);
    for (const [key, value] of entries) {
      const row = el('div', 'story-recap-row');
      row.append(el('dt', '', labels[key] || humanise(key)));
      row.append(el('dd', '', values[value] || humanise(value)));
      list.append(row);
    }
    if (entries.length) panel.append(list);
    panel.append(el('p', 'story-end-note', 'End of the Chapter 1 preview'));
    const actions = el('div', 'story-actions story-actions--end');
    actions.append(this._button('Play again', () => { this.hide(); onReplay?.(); }));
    actions.append(this._button('Change character', () => { this.hide(); onEdit?.(); }, true));
    panel.append(actions);
  }
}
