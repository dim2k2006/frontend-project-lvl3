import axios from 'axios';
import { watch } from 'melanke-watchjs';
import isURL from 'validator/lib/isURL';
import isEmpty from 'validator/lib/isEmpty';
import get from 'lodash/get';
import includes from 'lodash/includes';
import find from 'lodash/find';
import findIndex from 'lodash/findIndex';
import flatten from 'lodash/flatten';
import uuidv4 from 'uuid/v4';
import StateMachine from 'javascript-state-machine';

const parseDom = (string, type) => {
  const domparser = new DOMParser();

  return domparser.parseFromString(string, type);
};

const getFeed = (doc) => {
  const title = doc.querySelector('title').textContent;
  const description = doc.querySelector('description').textContent;
  const posts = Array.from(doc.querySelectorAll('item'))
    .map(item => ({
      id: uuidv4(),
      title: item.querySelector('title').textContent,
      description: item.querySelector('description').textContent,
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
    modal: {
      title: '',
      description: '',
    },
  };

  const formStateMachine = new StateMachine({
    init: 'empty',
    transitions: [
      { name: 'reset', from: ['invalid', 'valid'], to: 'empty' },
      { name: 'validate', from: ['empty', 'invalid'], to: 'valid' },
      { name: 'invalidate', from: ['empty', 'valid'], to: 'invalid' },
    ],
    methods: {
      onReset: () => {
        state.form.isValid = true;
        state.form.submitDisabled = true;
      },
      onValidate: () => {
        state.form.isValid = true;
        state.form.submitDisabled = false;
      },
      onInvalidate: () => {
        state.form.isValid = false;
        state.form.submitDisabled = true;
      },
    },
  });

  const form = document.querySelector('form');
  const formInput = form.querySelector('input');
  const formButton = form.querySelector('button');
  const spinner = formButton.querySelector('span');
  const feeds = document.querySelector('#feeds');
  const posts = document.querySelector('#posts');
  const modal = document.querySelector('#modal');
  const modalTitle = modal.querySelector('.modal-title');
  const modalBody = modal.querySelector('.modal-body');

  const renderForm = (s) => {
    formInput.classList[formStateMachine.is('valid') || formStateMachine.is('empty') ? 'remove' : 'add']('is-invalid');

    formInput.disabled = s.form.isFetching;
    formButton.disabled = s.form.isFetching || s.form.submitDisabled;
    spinner.classList[s.form.isFetching ? 'remove' : 'add']('d-none');
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

  formInput.addEventListener('input', (event) => {
    const value = get(event, 'target.value', '');
    const isValid = isURL(value) && !includes(state.feeds.map(f => f.url), value);

    if (isEmpty(value)) {
      if (formStateMachine.can('reset')) formStateMachine.reset();

      return;
    }

    if (isValid) {
      if (formStateMachine.can('validate')) formStateMachine.validate();

      return;
    }

    if (formStateMachine.can('invalidate')) formStateMachine.invalidate();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const feedUrl = formInput.value;

    const onResolve = (response) => {
      const dom = parseDom(get(response, 'data', ''), 'application/xml');
      const feed = getFeed(dom);

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

  posts.addEventListener('click', (event) => {
    const isModalButton = get(event, 'target.dataset.toggle', undefined) === 'modal';

    if (!isModalButton) return;

    const id = get(event, 'target.dataset.id', undefined);
    const [selectedPost] = flatten(state.feeds.map(feed => feed.posts))
      .filter(post => post.id === id);

    state.modal.title = selectedPost.title;
    state.modal.description = selectedPost.description;
  });

  const updateFeeds = (list = []) => {
    const onResolve = (response = []) => {
      response
        .map((item) => {
          const dom = parseDom(get(item, 'data', ''), 'application/xml');

          return getFeed(dom);
        })
        .forEach((feed) => {
          const prevFeedIndex = findIndex(list, item => item.title === feed.title);
          const prevFeed = get(list, `${prevFeedIndex}`, {});
          const prevPosts = get(prevFeed, 'posts', []);
          const currentPosts = get(feed, 'posts', []);
          const newPosts = currentPosts
            .reduce((accumulator, post) => {
              const isNew = !find(prevPosts, p => p.link === post.link);

              return isNew ? [...accumulator, post] : accumulator;
            }, []);

          state.feeds[prevFeedIndex].posts = [...newPosts, ...state.feeds[prevFeedIndex].posts];
        });
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
