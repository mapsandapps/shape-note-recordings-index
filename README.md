# Shape Note Recordings Index

```sh
npm install
npm run dev
```

## 💽 Database

Currently using Astro DB, and currently all data is getting imported via db/seed.ts.

## 🧑🏻‍💻 Workflow for Getting New Data

### Nathan's Archive.org Recordings

- Visit http://localhost:4321/pending
- Watch the db/data/recordings folder for new files, or refresh the pending page after ~15 seconds
- View "known problems" on the pending page
- Correct problems in the pending json file
- Change all statuses in the pending json file to "CONFIRMED"
- Remove the string '-pending' from the json file name
- The next time the app builds, all the new data will be included automatically
- Rebuild the app and commit the new file now

### Bandcamp "Album"

- Change pending.astro to make a call to `pullOneBandcampItem()` with the relevant items
- Visit http://localhost:4321/pending
- (It will be loading data in the background)
- Remove or comment out the change to pending.astro
- Visit http://localhost:4321/pending again and the new data should be there
- Follow the remaining steps as above
