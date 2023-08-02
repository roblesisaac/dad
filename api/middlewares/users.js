export function concatToQuery(propName) {
  return (req, _, next) => {
    req.query = { ...req.query, [propName]: req.user[propName] };
    next();
  };
}