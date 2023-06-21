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
        value: itm => itm.year+itm.make+itm.model+itm.submodel
    },
    label2: {
        name: 'mm',
        value: itm => itm.make+itm.model+itm.submodel
    }
});

export default { address, cars, messages, users };