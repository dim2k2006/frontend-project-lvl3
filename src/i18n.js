import i18next from 'i18next';

const getTranslations = () => {
  i18next.init({
    lng: 'en',
    resources: {
      en: {
        translation: {
          FETCH_ERR: 'Something went wrong during feed fetching. Please try again 😉',
          UPDATE_ERR: 'Something went wrong during feeds updating. Please check your internet connection 😉',
        },
      },
    },
  });

  return i18next;
};

export default getTranslations;
