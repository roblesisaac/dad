import Record from '../utils/recordJS';
import users from './users';
import address from './address';
import messages from './messages';

const cars = Record('cars', {
    year: Number,
    make: String,
    model: String,
    submodel: String,
    engine: String,
    label1: {
        name: 'ymm',
        value: input => input.year+input.make+input.model+input.submodel
    },
    label2: {
        name: 'mm',
        value: input => input.make+input.model+input.submodel
    }
});

export default { address, cars, messages, users };