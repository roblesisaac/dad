export default function(length = 10, { isUppercase = false } = {}) {
    const randomString = Math.random().toString(36).substring(2, 2 + length);

    return isUppercase ? randomString.toUpperCase() : randomString;
}