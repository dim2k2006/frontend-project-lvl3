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
import Parser from 'rss-parser';
import getTranslations from './i18n';

const parser = new Parser();

const parseRss = string => parser.parseString(string);

const getFeed = (data) => {
  const feedId = uuidv4();
  const title = get(data, 'title', '');
  const description = get(data, 'description', '');
  const posts = get(data, 'items', [])
    .map(item => ({
      id: uuidv4(),
      feedId,
      title: item.title,
      description: item.content,
      link: item.link,
    }));

  return {
    id: feedId,
    title,
    description,
    posts,
  };
};

export default () => {
  const cors = 'https://cors-anywhere.herokuapp.com/';
  const i18n = getTranslations();

  const state = {
    addingFeed: 'init', // init, valid, invalid, processing, processed, error
    updatingFeeds: 'init', // init, error
    feeds: [],
    posts: [],
    modal: {
      title: '',
      description: '',
    },
    error: '',
    updateFeedsError: '',
  };

  const formRoot = document.querySelector('form');
  const formInputRoot = formRoot.querySelector('input');
  const formButtonRoot = formRoot.querySelector('button');
  const spinnerRoot = formButtonRoot.querySelector('span');
  const feedsRoot = document.querySelector('#feeds');
  const postsRoot = document.querySelector('#posts');

  const modalRoot = document.querySelector('#modal');
  const modalTitleRoot = modalRoot.querySelector('.modal-title');
  const modalBodyRoot = modalRoot.querySelector('.modal-body');

  const errorRoot = document.querySelector('#error');
  const errorMessageRoot = errorRoot.querySelector('span');

  const updateFeedsErrorRoot = document.querySelector('#updateError');
  const updateFeedsErrorMessageRoot = updateFeedsErrorRoot.querySelector('span');

  const formStatesMap = {
    init: () => {
      formButtonRoot.disabled = true;
    },
    valid: () => {
      formInputRoot.classList.remove('is-invalid');
      formButtonRoot.disabled = false;
    },
    invalid: () => {
      formInputRoot.classList.add('is-invalid');
      formButtonRoot.disabled = true;
    },
    processing: () => {
      formInputRoot.disabled = true;
      formButtonRoot.disabled = true;
      spinnerRoot.classList.remove('d-none');
    },
    processed: () => {
      formInputRoot.value = '';
      formInputRoot.disabled = false;
      formButtonRoot.disabled = true;
      spinnerRoot.classList.add('d-none');
      errorRoot.classList.add('d-none');
    },
    error: () => {
      errorRoot.classList.remove('d-none');
      formInputRoot.disabled = false;
      formButtonRoot.disabled = false;
      spinnerRoot.classList.add('d-none');
    },
  };

  const updatingFeedsStateMap = {
    init: () => {
      updateFeedsErrorRoot.classList.add('d-none');
    },
    error: () => {
      updateFeedsErrorRoot.classList.remove('d-none');
    },
  };

  const renderForm = (s) => {
    const process = formStatesMap[s.addingFeed];

    process();
  };

  const renderUpdatingFeeds = (s) => {
    const process = updatingFeedsStateMap[s.updatingFeeds];

    process();
  };

  const renderFeeds = (s) => {
    const html = s.feeds
      .map(feed => `<li class="list-group-item"><h5>${feed.title}</h5><p>${feed.description}</p></li>`)
      .join('');

    feedsRoot.innerHTML = html;
  };

  const renderPosts = (s) => {
    const html = s.feeds
      .map((feed) => {
        const postsHtml = s.posts
          .filter(post => post.feedId === feed.id)
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

    postsRoot.innerHTML = html;
  };

  const renderModal = (s) => {
    modalTitleRoot.textContent = s.modal.title;
    modalBodyRoot.textContent = s.modal.description;
  };

  const renderError = (s) => {
    errorMessageRoot.textContent = i18n.t(s.error);
  };

  const renderUpdateFeedsError = (s) => {
    updateFeedsErrorMessageRoot.textContent = i18n.t(s.updateFeedsError);
  };

  watch(state, 'addingFeed', () => {
    renderForm(state);
  });

  watch(state, 'updatingFeeds', () => {
    renderUpdatingFeeds(state);
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

  watch(state, 'error', () => {
    renderError(state);
  });

  watch(state, 'updateFeedsError', () => {
    renderUpdateFeedsError(state);
  });

  formInputRoot.addEventListener('input', (event) => {
    const value = get(event, 'target.value', '');
    const isValid = isURL(value) && !includes(state.feeds.map(f => f.url), value);

    if (isEmpty(value)) {
      state.addingFeed = 'init';

      return;
    }

    if (isValid) {
      state.addingFeed = 'valid';

      return;
    }

    state.addingFeed = 'invalid';
  });

  formRoot.addEventListener('submit', (event) => {
    event.preventDefault();

    const feedUrl = formInputRoot.value;

    const onResolve = response => parseRss(get(response, 'data', ''))
      .then((data) => {
        const feed = getFeed(data);
        const id = get(feed, 'id');
        const title = get(feed, 'title');
        const description = get(feed, 'description');
        const posts = get(feed, 'posts');

        state.feeds.push({
          id,
          title,
          description,
          url: feedUrl,
        });

        state.posts = [...state.posts, ...posts];

        state.addingFeed = 'processed';
      });

    const onReject = () => {
      state.addingFeed = 'error';

      state.error = 'FETCH_ERR';
    };

    state.addingFeed = 'processing';

    axios
      .get(`${cors}${feedUrl}`)
      .then(onResolve)
      .catch(onReject);
  });

  postsRoot.addEventListener('click', (event) => {
    const id = get(event, 'target.dataset.id', null);
    const [selectedPost] = flatten(state.feeds.map(feed => feed.posts))
      .filter(post => post.id === id);

    const title = get(selectedPost, 'title', '');
    const description = get(selectedPost, 'description', '');

    state.modal.title = title;
    state.modal.description = description;
  });

  const updateFeeds = (list = []) => {
    const onResolve = (response = []) => {
      const parserPromises = response
        .map(item => parseRss(get(item, 'data', '')));

      Promise
        .all(parserPromises)
        .then(data => data
          .map(getFeed)
          .forEach((feed) => {
            const prevFeedIndex = findIndex(list, item => item.title === feed.title);
            const prevFeed = get(list, `${prevFeedIndex}`);
            const prevPosts = get(prevFeed, 'posts');
            const currentPosts = get(feed, 'posts');
            const newPosts = differenceBy(currentPosts, prevPosts, 'link');

            state.feeds[prevFeedIndex].posts = [...newPosts, ...state.feeds[prevFeedIndex].posts];
            state.updatingFeeds = 'init';
          }));
    };

    const onReject = () => {
      state.updatingFeeds = 'error';
      state.updateFeedsError = 'UPDATE_ERR';
    };

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
