module.exports = {
  join: (...args) => {
    return args
      .filter(segment => segment && typeof segment === 'string')
      .map(segment => segment.replace(/\/+/g, '/'))
      .join('/');
  }
};