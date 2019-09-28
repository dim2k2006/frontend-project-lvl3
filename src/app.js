import { watch } from 'melanke-watchjs';
import isURL from 'validator/lib/isURL';
import isEmpty from 'validator/lib/isEmpty';
import get from 'lodash/get';
import includes from 'lodash/includes';

export default () => {
  const state = {
    form: {
      isValid: true,
      submitDisabled: true,
    },
    feeds: [],
    posts: [],
  };

  const form = document.querySelector('form');
  const formInput = form.querySelector('input');
  const formButton = form.querySelector('button');

  const feeds = document.querySelector('#feeds');

  const renderForm = (s) => {
    formInput.classList[s.form.isValid ? 'remove' : 'add']('is-invalid');
    formButton.disabled = s.form.submitDisabled;
  };

  const renderFeeds = (s) => {
    const html = s.feeds
      .map(feed => `<li class="list-group-item">${feed}</li>`)
      .join('');

    feeds.innerHTML = html;
  };

  watch(state, 'form', () => {
    renderForm(state);
  });

  watch(state, 'feeds', () => {
    renderFeeds(state);
  });

  formInput.addEventListener('input', (event) => {
    const value = get(event, 'target.value', '');
    const isValid = isURL(value) && !includes(state.feeds, value);

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

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    state.feeds.push(formInput.value);

    form.reset();

    state.form.isValid = true;
    state.form.submitDisabled = true;
  });

  renderForm(state);
  renderFeeds(state);
};
