export default function scrub(response, propsToRemove) {
    if(!response) return null;
    propsToRemove = Array.isArray(propsToRemove) ? propsToRemove : [propsToRemove];
  
    if(Array.isArray(response)) {
      return response.map(item => {
        for(const removeProp of propsToRemove) {
          delete item[removeProp];
        }
  
        return item;
      });
    }
  
    for(const removeProp of propsToRemove) {
      delete response[removeProp];
    }
  
    return response;
  }