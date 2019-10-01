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

export default () => {
  const cors = 'https://cors-anywhere.herokuapp.com/';

  const state = {
    form: {
      isValid: true,
      isFetching: false,
      submitDisabled: true,
    },
    feeds: [],
  };

  const form = document.querySelector('form');
  const formInput = form.querySelector('input');
  const formButton = form.querySelector('button');
  const spinner = formButton.querySelector('span');
  const feeds = document.querySelector('#feeds');
  const posts = document.querySelector('#posts');

  const renderForm = (s) => {
    formInput.classList[s.form.isValid ? 'remove' : 'add']('is-invalid');
    formInput.disabled = s.form.isFetching;
    formButton.disabled = s.form.isFetching || s.form.submitDisabled;
    spinner.style.display = s.form.isFetching ? 'inline-block' : 'none';
  };

  const renderFeeds = (s) => {
    const html = s.feeds
      .map(feed => `<li class="list-group-item"><h5>${feed.title}</h5><p>${feed.description}</p></li>`)
      .join('');

    feeds.innerHTML = html;
  };

  const renderPosts = (s) => {
    const html = s.feeds
      .map((feed) => {
        const postsHtml = feed.posts
          .map(post => `<li><a href="${post.link}" target="_blank">${post.title}</a></li>`)
          .join('');

        return `<li class="list-group-item"><h5>${feed.title}</h5><ul>${postsHtml}</ul></li>`;
      })
      .join('');

    posts.innerHTML = html;
  };

  watch(state, 'form', () => {
    renderForm(state);
  });

  watch(state, 'feeds', () => {
    renderFeeds(state);
    renderPosts(state);
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

    state.form.isFetching = true;

    axios
      .get(`${cors}${feedUrl}`)
      .then(onResolve)
      .catch(onReject)
      .finally(() => {
        state.form.isFetching = false;
      });
  });

  renderForm(state);
  renderFeeds(state);
  renderPosts(state);
};
