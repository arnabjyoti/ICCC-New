const getCurrentIST = () => {
  return new Date(
    new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata'
    })
  );
};

module.exports = { getCurrentIST };
