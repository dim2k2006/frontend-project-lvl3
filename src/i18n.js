import i18next from 'i18next';

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

export default i18next;
