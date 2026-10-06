<?php

class MailcowSessionSyncPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'Mailcow Session Sync',
		AUTHOR = 'mailcow-snappymail-integration contributors',
		VERSION = '1.1.0',
		RELEASE = '2026-10-05',
		REQUIRED = '2.38.2',
		CATEGORY = 'General',
		LICENSE = 'AGPL-3.0-only',
		DESCRIPTION = 'Synchronizes the SnappyMail webmail session with the mailcow session.';

	public function Init() : void
	{
		// User scope loads on both the guest/login page and authenticated webmail.
		$this->addJs('js/session-sync.js');
		$this->addCss('css/session-sync.css');
		$this->addJsonHook('SessionState', 'GetSessionState');
	}

	/**
	 * Read the current authenticated root account from the live SnappyMail token.
	 * This is deliberately a request-time lookup, not a value cached in AppData.
	 */
	public function GetSessionState()
	{
		$oActions = $this->Manager()->Actions();
		if ($oActions instanceof \RainLoop\ActionsAdmin) {
			return $this->jsonResponse(__FUNCTION__, [
				'ready' => false,
				'authenticated' => false,
				'primaryAccount' => ''
			]);
		}

		$oAccount = $oActions->getMainAccountFromToken(false);
		if (!$oAccount) {
			return $this->jsonResponse(__FUNCTION__, [
				'ready' => true,
				'authenticated' => false,
				'primaryAccount' => ''
			]);
		}

		return $this->jsonResponse(__FUNCTION__, [
			'ready' => true,
			'authenticated' => true,
			'primaryAccount' => (string) $oAccount->Email()
		]);
	}
}
