import Record from '../utils/recordJS';
import users from './users';

const cars = Record('cars', {
    year: Number,
    make: String,
    model: 'string',
    submodel: 'string',
    engine: 'string',
    label1: {
        name: 'ymm',
        value: input => input.year+input.make+input.model+input.submodel
    },
    label2: {
        name: 'mm',
        value: input => input.make+input.model+input.submodel
    }
});

export default { cars, users };