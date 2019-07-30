#!/usr/bin/env node


const childProcess		= require('child_process');
const fs				= require('fs');
const mkdirp			= require('mkdirp');
const {addInviteCode}	= require('./addinvitecode');
const {getQR}			= require('./qr');


const businessCardBackground	= `${__dirname}/../shared/assets/img/business-card-back.png`;
const businessCardInvite		= `${__dirname}/../shared/assets/img/business-card-invite.png`;

const qrInviteCodeDir				= `${__dirname}/../qr-invite-codes`;
const qrInviteCodeBusinessCardDir	= `${__dirname}/../qr-invite-codes/business-cards`;
const qrInviteCodeQRDir				= `${__dirname}/../qr-invite-codes/qrs`;
const qrInviteCodeURLDir			= `${__dirname}/../qr-invite-codes/urls`;


const qrInviteCode	= async (countByUser, plan) => {


childProcess.spawnSync('rm', ['-rf', qrInviteCodeDir]);
mkdirp.sync(qrInviteCodeBusinessCardDir);
mkdirp.sync(qrInviteCodeQRDir);
mkdirp.sync(qrInviteCodeURLDir);

const inviteCodes	= Object.values(
	await addInviteCode('cyphme', countByUser, undefined, plan)
)[0];

for (let i = 0 ; i < inviteCodes.length ; ++i) {
	const url	= `https://cyph.app/register/${inviteCodes[i]}`;

	const businessCardPath	= `${qrInviteCodeBusinessCardDir}/${i}.png`;
	const qrPath			= `${qrInviteCodeQRDir}/${i}.png`;
	const urlPath			= `${qrInviteCodeURLDir}/${i}.txt`;

	fs.writeFileSync(urlPath, url);
	await getQR(url, qrPath);

	childProcess.spawnSync('convert', [qrPath, '-resize', '675x675', businessCardPath]);
	childProcess.spawnSync('composite', [
		'-geometry',
		'+956+290',
		businessCardPath,
		businessCardBackground,
		businessCardPath
	]);
	childProcess.spawnSync('composite', [
		'-geometry',
		'+444+48',
		businessCardInvite,
		businessCardPath,
		businessCardPath
	]);
}


};


if (require.main === module) {
	(async () => {
		const count				= toInt(process.argv[2]);
		const plan				= process.argv[3];
		const inviterUsername	= process.argv[4] || '';

		await qrInviteCode(
			{[inviterUsername]: isNaN(count) ? 1 : count},
			plan
		);

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
else {
	module.exports	= {qrInviteCode};
}
