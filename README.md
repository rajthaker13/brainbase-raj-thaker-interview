# Brainbase UiPI

Today, while a lot of popular services have APIs, most enterprise applications used by thousands of companies don't have programmatic ways to access them which effectively close them for AI automation.

Brainbase UiPI is a service that creates APIs for anything by recording screen movements and serving them on headless Selenium instances.

## Installing Brainbase UiPI

### Prerequisites

Before you begin, ensure you have Python and Node.js is installed on your machine. If not, you can download and install it from [Node.js official website](https://nodejs.org/).

### Installation

Clone the repository to your local machine:

```bash
git clone https://github.com/BrainbaseHQ/brainbase-uipi--template
cd brainbase-uipi-template
```

## Components
Brainbase UiPI has three main components:

1. Brainbase UiPI Chrome Extension

The Brainbase UiPI Chrome Extension allows users to record movements on any website which can then be used to recreate the motions on a headless browser instance to be used as an API.

For this part, you are required to create a Chrome Extension that will read and record the following actions on any website the user is on:

- Mouse move
- Scroll
- Click
- Type
- Href (change pages)

The user flow for the Chrome Extension is as follows:

1. User navigates to the website thaey want to start their workflow on.
2. User opens the Chrome Extension and clicks the Record button.
3. The system starts saving the movements and actions described above (as well as parameters such as window size, cookies, etc.) into a temporary data structure.
4. When the user wants to stop the workflow, they click on the Stop Recording button on the Chrome Extension.
5. The Chrome Extension prompts them to enter an endpoint with which this API can be called such as `/update-crm` or `/order-book-on-amazon`.
6. The workflow and the endpoint are saved to a Postgres database (instruction for running a local Postgres on your machine can be found [here](https://www.prisma.io/dataguide/postgresql/setting-up-a-local-postgresql-database)).

This concludes the Chrome Extension portion of Brainbase UiPI.

2. Brainbase UiPI server

The UiPI server is a simple FastAPI server that has three endpoints:

- `POST /uipi/create`: This endpoint is hit with the `endpoint` and the `workflow` values and saves them to the Postgres database.
- `POST /uipi/run/[endpoint]`: This endpoint is called with the `endpoint` and runs the given workflow steps in a headless browser instance as a subprocess.
- `GET /uipi/list`: This endpoint lists all the available UiPIs in the database.

The server code is given to you at `/server/main.py`, however you're free to modify as you see fit, as long as it satisfies the outlined requirements of the project.

3. Brainbase UiPI worker

The UiPI worker is a Python script which is called from `/server/main.py` with the workflow steps, and is able to perform them on a headless browser instance.

## Usage

To use the Chrome Extension, you can follow [these steps](https://webkul.com/blog/how-to-install-the-unpacked-extension-in-chrome/).

You can use `uvicorn` to run the server.

## Milestones

This is a challenging project so we suggest that you follow the following milestones:

### Milestone 1: Web recording Chrome Extension
For the first milestone, complete the Chrome Extension to record actions on a webpage.

The success criteria for this milestone is:

-[] Chrome Extension can be accessed through the Chrome Browser
-[] Chrome Extension UI is completed (Start/Stop Record buttons, endpoint input)
-[] Chrome Exntesion can record and locally store the actions:

    - Mouse move
    - Scroll
    - Click
    - Type
    - Href (change pages)

    with the correct parameters (click should have an identifier for the component, mouse move should have coordinates, etc.)
-[] Chrome Extension can hit the correct server endpoints to save recordings

### Milestone 2: Recreating movements
For the second milestone, complete the worker to recreate the workflows created.

The success criteria for this milestone is:

-[] Worker can run a headless browser locally
-[] Multiple workers can be run in parallel at the same time (if you hit `/uipi/run/endpoint_1` and `/uipi/run/endpoint_2` at the same time, both should run as subprocesses without blocking each other)
-[] The headless browser can recreate the recorded workflow accurately (this is tested by scenarios outlined below)

### Milestone 3: Fault tolerance
Browser automation is famously difficult, mainly because the underlying elements can change identifiers between different browser instances.

For Milestone 3, we want you to think about how to make the system more resilient. Here are some ideas but feel free to come up with your own:

-[] Saving cookies as well so that the started up browser instance is as close as possible to the original instance
-[] Using multiple identifiers in a waterfall

## Scenarios

Your implementation will be tested on the following scenarios, which range from easy to hard:

-[] (EASY) Navigate the [Y Combinator](https://www.ycombinator.com/) website:
    Go to https://www.ycombinator.com/ -> Move mouse to Companies tab -> Click on Top Companies -> Click on See all companies
-[] (MEDIUM) Use [ChatGPT](https://chatgpt.com/):
    Go to https://chatgpt.com/ -> Click on New Chat button -> Click on input field -> Type in "Who's the only musician to ever receive a Nobel Prize in Literature?" -> Click Submit
-[] (HARD) Add to cart on [Amazon](https://www.amazon.com/):
    Go to https://amazon.com/ -> Click on search input box -> Type in "Softwar: An Intimate Portrait of Larry Ellison and Oracle" -> Click on first result -> Click on Add to Cart

MEDIUM and HIGH scenarios assume that you have saved your cookies with the workflow to go around authentication.

## Conclusion

Completed correctly, you should now have a system that can automate almost any website as an API that can be called programmatically.