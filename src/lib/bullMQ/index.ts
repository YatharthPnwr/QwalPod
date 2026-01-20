import { Queue } from "bullmq";

const consolidateFilesQueue = new Queue("consolidateFiles", {
  connection: {
    host: "127.0.0.1",
    port: 6379,
  },
});

// async function checkExistingJob(jobToAdd) {
//   const job = await myQueue.getJobs();
//   if (job.includes(jobToAdd)) {
//     return true;
//   } else {
//     return false;
//   }
// }
export async function addJobs(jobName: string, jobToAdd: any) {
  //   const alreadyPresentJob = await checkExistingJob(JobToAdd);
  //   if (alreadyPresentJob) {
  //     console.log("Already added this job");
  //   } else {
  //     await myQueue.add(jobName, JobToAdd);
  //   }
  console.log("TRYING TO ADD A JOB TO THE QUEUE");
  await consolidateFilesQueue.add(jobName, jobToAdd);
}
