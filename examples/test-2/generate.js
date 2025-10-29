import { faker } from '@faker-js/faker';


// --- Parse command line args ---
const args = Object.fromEntries(
    process.argv
        .slice(2)
        .map(arg => arg.replace(/^--/, '').split('='))
);

const count = parseInt(args.count ?? 5, 10);
const numUsers = parseInt(args.users ?? 4, 10);
const numPets = parseInt(args.pets ?? 4, 10);


function makeRecord() {
    const user_attributes = {};
    const pet_attributes = {};

    // Create random users
    for (let i = 1; i < numUsers; i++) {
        // e.g. “alice”, “bob”, or random slug
        const id = faker.number.int({ min: 1, max: numPets });
        const userName = faker.person.firstName().toLowerCase();
        const userKey = `${userName}_${id}`;
        user_attributes[userKey] = {
            tenure: faker.number.int({ min: 1, max: 30 }),
            title: faker.helpers.arrayElement(['owner', 'employee', 'customer', 'manager']),
        };
    }
    const presetUserKey = "bob_0";
    user_attributes[presetUserKey] = {
        tenure: faker.number.int({ min: 1, max: 30 }),
        title: faker.helpers.arrayElement(['owner', 'employee', 'customer', 'manager']),
    };
    // Create random pets
    for (let i = 0; i < numPets; i++) {
        const petType = faker.helpers.arrayElement(['dog', 'cat', 'rabbit', 'hamster']);
        const id = faker.number.int({ min: 1, max: numPets });
        const petKey = `${petType}${id}`;
        pet_attributes[petKey] = {
            adopted: faker.datatype.boolean(),
            age: faker.number.int({ min: 0, max: 15 }),
            breed: faker.animal.type() || faker.helpers.arrayElement(['terrier', 'collie', 'bulldog', 'persian', 'siamese']),
            name: faker.person.firstName().toLowerCase(),
        };
        pet_attributes['dog_0'] = {
            adopted: true,
            age: faker.number.int({ min: 0, max: 15 }),
            breed: faker.animal.type() || faker.helpers.arrayElement(['terrier', 'collie', 'bulldog', 'persian', 'siamese']),
            name: faker.person.firstName().toLowerCase(),
        };
    }

    return {
        user_attributes,
        pet_attributes,
    };
}

// Generate e.g. 5 records
const records = makeRecord();

console.log(JSON.stringify(records, null, 2));
