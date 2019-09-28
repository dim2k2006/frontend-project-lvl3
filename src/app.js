import { watch } from 'melanke-watchjs';
import isURL from 'validator/lib/isURL';
import isEmpty from 'validator/lib/isEmpty';
import get from 'lodash/get';

export default () => {
  const state = {
    form: {
      isValid: true,
      submitDisabled: true,
    },
  };

  const formInput = document.querySelector('form input');
  const formButton = document.querySelector('form button');

  const renderForm = (s) => {
    formInput.classList[s.form.isValid ? 'remove' : 'add']('is-invalid');
    formButton.disabled = s.form.submitDisabled;
  };

  watch(state, 'form', () => {
    renderForm(state);
  });

  formInput.addEventListener('input', (event) => {
    const value = get(event, 'target.value', '');
    const isValid = isURL(value);

    if (isEmpty(value)) {
      state.form.isValid = true;
      state.form.submitDisabled = true;

      return;
    }

    if (isValid) {
      state.form.isValid = true;
      state.form.submitDisabled = false;

      return;
    }

    state.form.isValid = false;
    state.form.submitDisabled = true;
  });

  renderForm(state);
};
