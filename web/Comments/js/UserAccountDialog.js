
class UserAccountDialog {
  constructor(app) {
    this.app = app;
    this.dialog = null;
  }

  show() {
    const currentUser = this.app.currentUser;
    if (!currentUser) return;

    this.app.closeAllPopups();

    const content = makeElement('div', { className: 'user-account-dialog' });

    // --- DISPLAY NAME SECTION ---
    content.appendChild(makeElement('h3', {}, 'Edit Your Display Name'));
    content.appendChild(
      makeElement(
        'p',
        { className: 'info-text' },
        'You can change the capitalization or add color codes (e.g., "N@2ame") without changing your underlying unique name.'
      )
    );

    const nameInput = makeElement('input', {
      type: 'text',
      className: 'username-input',
      value: currentUser.displayName,
    });

    const preview = makeElement('div', { className: 'name-preview' });
    const infoText = makeElement('div', { className: 'info-text' });
    const saveButton = makeElement(
      'button',
      { className: 'post-button', disabled: true },
      'Save Changes'
    );

    const updatePreviewAndState = () => {
      const newName = nameInput.value;
      const newNormalized = NameRenderer.normalize(newName);

      preview.innerHTML = `Preview: ${NameRenderer.render(newName)}`;

      if (newNormalized !== currentUser.normalizedName) {
        infoText.textContent = `Error: Cannot change base name from "${currentUser.normalizedName}" to "${newNormalized}".`;
        infoText.classList.add('error');
        saveButton.disabled = true;
      } else if (newName === currentUser.displayName) {
        infoText.textContent = `Your unique name is "${currentUser.normalizedName}${currentUser.suffix}". You can change capitalization or colors.`;
        infoText.classList.remove('error');
        saveButton.disabled = true;
      } else {
        infoText.textContent = `Your unique name is "${currentUser.normalizedName}${currentUser.suffix}". This is a valid change.`;
        infoText.classList.remove('error');
        saveButton.disabled = false;
      }
    };

    nameInput.oninput = updatePreviewAndState;
    content.append(nameInput, preview, infoText);
    updatePreviewAndState();

    // --- PASSWORD / EMAIL SECTION ---
    const passwordSection = makeElement('div', {
      style:
        'margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);',
    });
    passwordSection.appendChild(
      makeElement('h3', { style: 'margin-top: 0;' }, 'Set Email & Password')
    );
    passwordSection.appendChild(
      makeElement(
        'p',
        { className: 'info-text' },
        'Add an email and password so you can log back into this account from any device. Your session cookie keeps you logged in automatically, but this lets you recover access if the cookie is cleared.'
      )
    );

    const emailInput = makeElement('input', {
      type: 'email',
      className: 'username-input',
      placeholder: 'Email Address',
      style: 'width: 100%; box-sizing: border-box; margin-bottom: 8px;',
    });
    const pwInput = makeElement('input', {
      type: 'password',
      className: 'username-input',
      placeholder: 'Password (min 8 characters)',
      style: 'width: 100%; box-sizing: border-box; margin-bottom: 8px;',
    });
    const pwConfirmInput = makeElement('input', {
      type: 'password',
      className: 'username-input',
      placeholder: 'Confirm Password',
      style: 'width: 100%; box-sizing: border-box;',
    });
    const pwInfoText = makeElement('div', {
      className: 'info-text',
      style: 'min-height: 18px; margin-top: 8px;',
    });
    const setPwButton = makeElement(
      'button',
      {
        className: 'post-button',
        style: 'margin-top: 10px;',
        onclick: async () => {
          pwInfoText.textContent = '';
          pwInfoText.classList.remove('error');

          const email = emailInput.value.trim();
          const pw = pwInput.value;
          const pwConfirm = pwConfirmInput.value;

          if (!email) {
            pwInfoText.textContent = 'Please enter an email address.';
            pwInfoText.classList.add('error');
            return;
          }
          if (pw.length < 8) {
            pwInfoText.textContent = 'Password must be at least 8 characters.';
            pwInfoText.classList.add('error');
            return;
          }
          if (pw !== pwConfirm) {
            pwInfoText.textContent = 'Passwords do not match.';
            pwInfoText.classList.add('error');
            return;
          }

          setPwButton.disabled = true;
          setPwButton.textContent = 'Saving...';

          const result = await this.app.serverAPI.setPassword(email, pw);
          if (result.success) {
            pwInfoText.textContent = 'Email and password saved successfully!';
            pwInfoText.classList.remove('error');
            pwInfoText.style.color = '#66bb6a';
            emailInput.value = '';
            pwInput.value = '';
            pwConfirmInput.value = '';
          } else {
            pwInfoText.textContent = result.error || 'Failed to save.';
            pwInfoText.classList.add('error');
          }
          setPwButton.disabled = false;
          setPwButton.textContent = 'Save Email & Password';
        },
      },
      'Save Email & Password'
    );

    passwordSection.append(
      emailInput,
      pwInput,
      pwConfirmInput,
      pwInfoText,
      setPwButton
    );
    content.appendChild(passwordSection);

    this.dialog = new DialogBoxExtended({
      title: 'My Account',
      content,
      buttons: [
        {
          instance: saveButton,
          onClick: async (e, closeDialog) => {
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
            const result = await this.app.serverAPI.updateUserDisplayName(
              nameInput.value
            );
            if (result.success) {
              this.app.setCurrentUser(result.user);
              closeDialog();
            } else {
              alert(`Error: ${result.error}`);
              saveButton.disabled = false;
              saveButton.textContent = 'Save Changes';
            }
          },
        },
        { label: 'Cancel', isCloseButton: true },
      ],
      onClose: () => {
        this.dialog = null;
      },
    });
  }

}

