import records from '../utils/records';
import users from './users';

const cars = records('cars', {
    year: 'number',
    make: 'string',
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