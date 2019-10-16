import axios from 'axios';
import { watch } from 'melanke-watchjs';
import isURL from 'validator/lib/isURL';
import isEmpty from 'validator/lib/isEmpty';
import get from 'lodash/get';
import includes from 'lodash/includes';
import findIndex from 'lodash/findIndex';
import flatten from 'lodash/flatten';
import differenceBy from 'lodash/differenceBy';
import uuidv4 from 'uuid/v4';
import i18next from 'i18next';
import Parser from 'rss-parser';

i18next.init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        FETCH_ERR: 'Something went wrong during feed fetching. Please try again 😉',
      },
    },
  },
});

const parser = new Parser();

const parseRss = string => parser.parseString(string);

const getFeed = (data) => {
  const title = get(data, 'title', '');
  const description = get(data, 'description', '');
  const posts = get(data, 'items', [])
    .map(item => ({
      id: uuidv4(),
      title: item.title,
      description: item.content,
      link: item.link,
    }));

  return { title, description, posts };
};

export default () => {
  const cors = 'https://cors-anywhere.herokuapp.com/';

  const state = {
    form: 'init', // init, valid, invalid, processing, processed, error
    feeds: [],
    modal: {
      title: '',
      description: '',
    },
    error: '',
  };

  const form = document.querySelector('form');
  const formInput = form.querySelector('input');
  const formButton = form.querySelector('button');
  const spinner = formButton.querySelector('span');
  const feeds = document.querySelector('#feeds');
  const posts = document.querySelector('#posts');
  const modal = document.querySelector('#modal');
  const modalTitle = modal.querySelector('.modal-title');
  const modalBody = modal.querySelector('.modal-body');
  const error = document.querySelector('#error');
  const errorMessage = error.querySelector('span');

  const formStatesMap = {
    init: () => {
      formButton.disabled = true;
    },
    valid: () => {
      formInput.classList.remove('is-invalid');
      formButton.disabled = false;
    },
    invalid: () => {
      formInput.classList.add('is-invalid');
      formButton.disabled = true;
    },
    processing: () => {
      formInput.disabled = true;
      formButton.disabled = true;
      spinner.classList.remove('d-none');
    },
    processed: () => {
      formInput.value = '';
      formInput.disabled = false;
      formButton.disabled = false;
      spinner.classList.add('d-none');
      error.classList.add('d-none');
    },
    error: () => {
      error.classList.remove('d-none');
      formInput.disabled = false;
      formButton.disabled = false;
      spinner.classList.add('d-none');
    },
  };

  const renderForm = (s) => {
    const process = formStatesMap[s.form];

    process();
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
          .map(post => `
              <div class="card" style="margin-bottom: 15px;">
                  <div class="card-body">
                    <div>
                        <a href="${post.link}" target="_blank">${post.title}</a>
                    </div>
                    
                    <br>
                    
                    <div>
                        <button type="button" class="btn btn-outline-primary btn-sm" data-toggle="modal" data-target="#modal" data-id="${post.id}">Preview</button>
                    </div>
                  </div>
              </div>
            `)
          .join('');

        return `<li class="list-group-item"><h5>${feed.title}</h5>${postsHtml}</li>`;
      })
      .join('');

    posts.innerHTML = html;
  };

  const renderModal = (s) => {
    modalTitle.textContent = s.modal.title;
    modalBody.textContent = s.modal.description;
  };

  const renderError = (s) => {
    errorMessage.textContent = i18next.t(s.error);
  };

  watch(state, 'form', () => {
    renderForm(state);
  });

  watch(state, 'feeds', () => {
    renderFeeds(state);
    renderPosts(state);
  });

  watch(state, 'modal', () => {
    renderModal(state);
  });

  watch(state, 'error', () => {
    renderError(state);
  });

  formInput.addEventListener('input', (event) => {
    const value = get(event, 'target.value', '');
    const isValid = isURL(value) && !includes(state.feeds.map(f => f.url), value);

    if (isEmpty(value)) {
      state.form = 'init';

      return;
    }

    if (isValid) {
      state.form = 'valid';

      return;
    }

    state.form = 'invalid';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const feedUrl = formInput.value;

    const onResolve = response => parseRss(get(response, 'data', ''))
      .then((data) => {
        const feed = getFeed(data);

        state.feeds.push({ ...feed, url: feedUrl });

        state.form = 'processed';
      });

    const onReject = () => {
      state.form = 'error';

      state.error = 'FETCH_ERR';
    };

    state.form = 'processing';

    axios
      .get(`${cors}${feedUrl}`)
      .then(onResolve)
      .catch(onReject);
  });

  posts.addEventListener('click', (event) => {
    const isModalButton = get(event, 'target.dataset.toggle', null) === 'modal';

    if (!isModalButton) return;

    const id = get(event, 'target.dataset.id', null);
    const [selectedPost] = flatten(state.feeds.map(feed => feed.posts))
      .filter(post => post.id === id);

    state.modal.title = selectedPost.title;
    state.modal.description = selectedPost.description;
  });

  const updateFeeds = (list = []) => {
    const onResolve = (response = []) => {
      const parserPromises = response
        .map(item => parseRss(get(item, 'data', '')));

      Promise
        .all(parserPromises)
        .then((data = []) => data
          .map(getFeed)
          .forEach((feed) => {
            const prevFeedIndex = findIndex(list, item => item.title === feed.title);
            const prevFeed = get(list, `${prevFeedIndex}`, {});
            const prevPosts = get(prevFeed, 'posts', []);
            const currentPosts = get(feed, 'posts', []);
            const newPosts = differenceBy(currentPosts, prevPosts, 'link');

            state.feeds[prevFeedIndex].posts = [...newPosts, ...state.feeds[prevFeedIndex].posts];
          }));
    };

    const onReject = () => console.log('Something went wrong during feeds update.');

    const requests = list
      .map(item => axios.get(`${cors}${item.url}`));

    axios
      .all(requests)
      .then(onResolve)
      .catch(onReject)
      .finally(() => setTimeout(() => updateFeeds(state.feeds), 10000));
  };

  renderForm(state);
  renderFeeds(state);
  renderPosts(state);
  renderModal(state);

  updateFeeds(state.feeds);
};
