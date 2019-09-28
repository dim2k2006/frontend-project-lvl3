import axios from 'axios';
import { watch } from 'melanke-watchjs';
import isURL from 'validator/lib/isURL';
import isEmpty from 'validator/lib/isEmpty';
import get from 'lodash/get';
import includes from 'lodash/includes';

const parseData = (string, type) => {
  const domparser = new DOMParser();
  const doc = domparser.parseFromString(string, type);
  const title = doc.querySelector('title').textContent;
  const description = doc.querySelector('description').textContent;
  const posts = [].slice.call(doc.querySelectorAll('item'))
    .map(item => ({
      title: item.querySelector('title').textContent,
      link: item.querySelector('link').textContent,
    }));

  return { title, description, posts };
};

// TODO
// 1. Prealoder on fetching
// 2. Disable all form during fetching
// 3. Layout (list of feed to aside column, list of posts in the middle)

export default () => {
  const cors = 'https://cors-anywhere.herokuapp.com/';

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
      .map(feed => `<li class="list-group-item"><h5>${feed.title}</h5><p>${feed.description}</p></li>`)
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
    const isValid = isURL(value) && !includes(state.feeds.map(f => f.url), value);

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

    const feedUrl = formInput.value;

    const onResolve = (response) => {
      const feed = parseData(get(response, 'data', ''), 'application/xml');

      state.feeds.push({ ...feed, url: feedUrl });

      form.reset();

      state.form.isValid = true;
      state.form.submitDisabled = true;
    };

    const onReject = () => {
      alert('Something went wrong. Please try again.');
    };

    axios
      .get(`${cors}${feedUrl}`)
      .then(onResolve)
      .catch(onReject);
  });

  renderForm(state);
  renderFeeds(state);
};