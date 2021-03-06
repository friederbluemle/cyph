#!/usr/bin/env node

const {config} = require('../modules/config');
const databaseService = require('../modules/database-service');
const {CyphPlans, CyphPlanTypes} = require('../modules/proto');
const {readableByteLength, titleize} = require('../modules/util');
const {addInviteCode} = require('./addinvitecode');
const {sendMail} = require('./email');
const {addToMailingList, mailingListIDs, splitName} = require('./mailchimp');

const inviteUser = async (
	projectId,
	email,
	name,
	plan,
	reservedUsername,
	trialMonths,
	count = 1,
	misc = {}
) => {
	/* TODO: Handle other cases */
	const accountsURL =
		projectId === 'cyphme' ?
			'https://cyph.app/' :
			'https://staging.cyph.app/';

	/* Previously gifted free users one-month premium trials */
	if (false && (!plan || plan === 'Free') && !trialMonths) {
		plan = 'MonthlyPremium';
		trialMonths = 1;
	}

	const {database} = databaseService(projectId);
	const namespacePath = 'cyph_ws';

	const inviteCodes = (await addInviteCode(
		projectId,
		{'': count},
		undefined,
		plan,
		reservedUsername,
		trialMonths,
		email,
		misc
	))[''];

	const inviteCode = inviteCodes[0];

	const cyphPlan = CyphPlans[plan] || CyphPlans.Free;
	const planConfig = config.planConfig[cyphPlan];

	if (projectId === 'cyphme' && email) {
		try {
			const {firstName, lastName} = splitName(name);

			const mailingListID = await addToMailingList(
				mailingListIDs.pendingInvites,
				email,
				{
					FNAME: firstName,
					ICODE: inviteCode,
					LNAME: lastName,
					PLAN: CyphPlans[cyphPlan],
					TRIAL: !!trialMonths
				}
			);

			await database
				.ref(`${namespacePath}/pendingInvites/${inviteCode}`)
				.set(mailingListID);
		}
		catch {}
	}

	await sendMail(
		!email ? undefined : !name ? email : `${name} <${email}>`,
		"You've Been Invited to Cyph!" +
			(cyphPlan === CyphPlans.Free ?
				'' :
			trialMonths ?
				` (with ${titleize(CyphPlans[cyphPlan])} trial)` :
				` (${titleize(CyphPlans[cyphPlan])})`),
		{
			data: {
				...planConfig,
				...(inviteCodes.length > 1 ? {inviteCodes} : {inviteCode}),
				name,
				planAnnualBusiness: cyphPlan === CyphPlans.AnnualBusiness,
				planAnnualTelehealth: cyphPlan === CyphPlans.AnnualTelehealth,
				planFoundersAndFriends:
					planConfig.planType === CyphPlanTypes.FoundersAndFriends,
				planFoundersAndFriendsTelehealth:
					planConfig.planType ===
					CyphPlanTypes.FoundersAndFriends_Telehealth,
				planFree: planConfig.planType === CyphPlanTypes.Free,
				planMonthlyBusiness: cyphPlan === CyphPlans.MonthlyBusiness,
				planMonthlyTelehealth: cyphPlan === CyphPlans.MonthlyTelehealth,
				planPlatinum: planConfig.planType === CyphPlanTypes.Platinum,
				planPremium: planConfig.planType === CyphPlanTypes.Premium,
				planSupporter: planConfig.planType === CyphPlanTypes.Supporter,
				platinumFeatures: planConfig.usernameMinLength === 1,
				storageCap: readableByteLength(planConfig.storageCapGB, 'gb')
			},
			templateName: 'new-cyph-invite'
		},
		undefined,
		undefined,
		accountsURL
	);

	return inviteCodes;
};

if (require.main === module) {
	(async () => {
		const projectId = process.argv[2];

		for (const {
			count,
			email,
			misc,
			name,
			plan,
			reservedUsername,
			trialMonths
		} of process.argv[3] === '--users' ?
			JSON.parse(process.argv[4]).map(arr => ({
				count: process.argv[6],
				email: arr[0],
				misc: arr[4],
				name: arr[1],
				plan: process.argv[5],
				reservedUsername: arr[2],
				trialMonths: arr[3]
			})) :
			[
				{
					count: process.argv[8],
					misc: JSON.parse(process.argv[9] || '{}'),
					email: process.argv[3],
					name: process.argv[4],
					plan: process.argv[5],
					reservedUsername: process.argv[6],
					trialMonths: process.argv[7]
				}
			]) {
			console.log(
				`Invited ${email} with invite codes ${JSON.stringify(
					await inviteUser(
						projectId,
						email,
						name,
						plan,
						reservedUsername,
						trialMonths,
						count,
						misc
					)
				)}`
			);
		}

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
else {
	module.exports = {inviteUser};
}
