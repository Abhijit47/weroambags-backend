function randomId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function fileNameInKebabCase(name) {
  const id = randomId();

  return (
    name.toLowerCase().replaceAll(' ', '-').replace(/\s/g, '-').split('.')[0] +
    '-' +
    id +
    '.' +
    name.split('.')[1]
  );
}

function isStringifiedJSON(data) {
  // Check if data is a string
  if (typeof data === 'string') {
    try {
      // Attempt to parse it as JSON
      JSON.parse(data);
      // If parsing succeeds, it's stringified JSON
      return true;
    } catch (e) {
      // If parsing fails, it's a regular string
      return false;
    }
  }
  // If data is not a string, it's not stringified JSON
  return false;
}

module.exports = { randomId, fileNameInKebabCase, isStringifiedJSON };
