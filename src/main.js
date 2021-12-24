const core = require('@actions/core');
const github = require('@actions/github');

async function runMain() {
  try {
    const jirProjectUrl = core.getInput('jira-project-url');
    const githubToken = core.getInput('GITHUB_TOKEN');

    const context = github.context;
    if (context.payload.pull_request == null) {
      core.setFailed('No pull request found.');

      return;
    }
    const octokit = new github.getOctokit(githubToken);
    const pullRequestNumber = context.payload.pull_request.number;
    const isPrevComment = await checkIfOldCommentExists(
      octokit,
      context,
      pullRequestNumber
    );
    if (isPrevComment) {
      console.log('Jira link bot comment already exists.');
      return;
    }
    const ticketNumber = grabTicket(context.payload.pull_request.title);
    if (!ticketNumber) {
      return;
    }
    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: pullRequestNumber,
      body: `Jira link: ${jirProjectUrl + '/' + ticketNumber}`
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function checkIfOldCommentExists(octokit, context, pullRequestNumber) {
  const commentsMeta = await octokit.rest.issues.listComments({
    ...context.repo,
    issue_number: pullRequestNumber
  });
  const isPrevComment = commentsMeta.data.some(
    (el) => el.user.login === 'github-actions[bot]'
  );
  return isPrevComment;
}

/**
 * Searches with first Ticket like structure with colon and later removes it.
 *
 * @param {string} title
 */
function grabTicket(title) {
  const ticketRegex = /^[A-Z,a-z]{2,}-\d{1,}:/g;
  const ticketIdWithColon = title.match(ticketRegex)?.[0];
  if (!ticketIdWithColon) {
    return null;
  }

  return ticketIdWithColon.slice(0, -1);
}

runMain();